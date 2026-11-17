import type { CollectionSlug, Payload } from 'payload'

type Column = object
type Condition = object
type Table = Readonly<Record<string, Column | undefined>>
interface UpdateResult {
  returning(fields: Readonly<Record<string, Column>>): Promise<readonly unknown[]>
}
interface UpdateBuilder {
  set(values: Readonly<Record<string, unknown>>): { where(condition: Condition): UpdateResult }
}
interface InsertBuilder {
  values(values: Readonly<Record<string, unknown>>): {
    returning(fields: Readonly<Record<string, Column>>): Promise<readonly unknown[]>
  }
}
interface Adapter {
  readonly drizzle: { update(table: Table): UpdateBuilder; insert(table: Table): InsertBuilder }
  readonly tables: Readonly<Record<string, Table | undefined>>
  readonly tableNameMap: ReadonlyMap<string, string>
  readonly operators: {
    and(...conditions: Condition[]): Condition
    or(...conditions: Condition[]): Condition
    equals(column: Column, value: unknown): Condition
    less_than_equal(column: Column, value: unknown): Condition
  }
}
interface D1Statement {
  bind(...values: readonly unknown[]): D1Statement
  run(): Promise<{ readonly meta: { readonly changes: number } }>
  first<T>(): Promise<T | null>
}
interface D1Binding {
  prepare(query: string): D1Statement
}

function adapter(payload: Payload): Adapter {
  const db: object = payload.db
  if (!('drizzle' in db && 'tables' in db && 'tableNameMap' in db && 'operators' in db))
    throw new Error('Voice persistence requires a Payload Drizzle adapter')
  return db as Adapter
}

function tableFor(db: Adapter, slug: string): Table {
  const snake = slug.replace(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`)
  const table = db.tables[db.tableNameMap.get(slug) ?? db.tableNameMap.get(snake) ?? slug]
  if (table === undefined) throw new Error(`Missing Payload table for ${slug}`)
  return table
}

function voiceColumn(payload: Payload, collection: CollectionSlug, key: string): Column {
  const column = tableFor(adapter(payload), collection)[key]
  if (column === undefined) throw new Error(`Missing ${collection}.${key} column`)
  return column
}

export async function voiceCas(
  payload: Payload,
  input: Readonly<{
    collection: CollectionSlug
    id: string
    where: Readonly<Record<string, unknown>>
    values: Readonly<Record<string, unknown>>
  }>,
): Promise<boolean> {
  const db = adapter(payload)
  const table = tableFor(db, input.collection)
  const conditions = [db.operators.equals(voiceColumn(payload, input.collection, 'id'), input.id)]
  for (const [key, value] of Object.entries(input.where))
    conditions.push(db.operators.equals(voiceColumn(payload, input.collection, key), value))
  const rows = await db.drizzle
    .update(table)
    .set(input.values)
    .where(db.operators.and(...conditions))
    .returning({ id: voiceColumn(payload, input.collection, 'id') })
  return rows.length === 1
}

export async function voiceInsert(
  payload: Payload,
  collection: CollectionSlug,
  values: Readonly<Record<string, unknown>>,
): Promise<Readonly<{ inserted: boolean; related: Readonly<Record<string, unknown>> }>> {
  const db = adapter(payload)
  const table = tableFor(db, collection)
  const id = voiceColumn(payload, collection, 'id')
  const at = new Date().toISOString()
  const fields = payload.collections[collection]?.config.flattenedFields ?? []
  const columns: Record<string, unknown> = { createdAt: at, updatedAt: at }
  const related: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(values)) {
    if (table[key] !== undefined) columns[key] = value
    else if (fields.some((field) => field.name === key)) related[key] = value
    else throw new Error(`No voice field ${collection}.${key}`)
  }
  const inserted = await db.drizzle.insert(table).values(columns).returning({ id })
  return { inserted: inserted.length === 1, related }
}

/** Atomic insert guarded by the per-user open-call limit and the persisted request key. */
export async function reserveVoiceCall(
  payload: Payload,
  input: Readonly<{
    id: string
    requestKey: string
    direction: string
    state: string
    numberId: string
    userId: string | null
    providerCallId: string | null
    updatedAt: number
    value: unknown
    maxConcurrentCalls: number
  }>,
): Promise<'inserted' | 'duplicate' | 'limit'> {
  const db = d1BindingOf(payload, 'Voice call reservations require a D1 binding')
  const insert = insertCallStatement(db, input)
  const result = await insert.run()
  if (result.meta.changes > 0) return 'inserted'
  const existing = await db
    .prepare('SELECT id FROM voice_calls WHERE request_key = ?')
    .bind(input.requestKey)
    .first<{ id: string }>()
  return existing === null ? 'limit' : 'duplicate'
}

function d1BindingOf(payload: Payload, message: string): D1Binding {
  const client: unknown = Reflect.get(payload.db, 'client')
  if (typeof client !== 'object' || client === null || !('prepare' in client)) throw new Error(message)
  return client as D1Binding
}

function insertCallStatement(db: D1Binding, input: Parameters<typeof reserveVoiceCall>[1]): D1Statement {
  const now = new Date().toISOString()
  return db
    .prepare(
      `INSERT INTO voice_calls
      (id,request_key,direction,state,number_id,user_id,provider_call_id,recovery_error,voice_updated_at,value,updated_at,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE
      (SELECT COUNT(*) FROM voice_calls WHERE state IN ('authorizing','ringing','connecting','active')) < ? AND
      (? IS NULL OR (SELECT COUNT(*) FROM voice_calls WHERE user_id = ? AND state IN ('authorizing','ringing','connecting','active')) < 1)
    ON CONFLICT(request_key) DO NOTHING`,
    )
    .bind(
      input.id,
      input.requestKey,
      input.direction,
      input.state,
      input.numberId,
      input.userId,
      input.providerCallId,
      recoveryError(input.value),
      input.updatedAt,
      JSON.stringify(input.value),
      now,
      now,
      Math.max(1, input.maxConcurrentCalls),
      input.userId,
      input.userId,
    )
}

/** Atomically claims the ringing call only when the answering user remains under the open-call cap. */
export async function claimVoiceCall(
  payload: Payload,
  input: Readonly<{
    id: string
    userId: string
    expectedUpdatedAt: number
    updatedAt: number
    value: unknown
    maxConcurrentCalls: number
  }>,
): Promise<boolean> {
  const db = d1BindingOf(payload, 'Inbound call claims require a D1 binding')
  const result = await db
    .prepare(
      `UPDATE voice_calls SET
      user_id = ?, state = 'connecting', voice_updated_at = ?, recovery_error = NULL, value = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ? AND state = 'ringing' AND user_id IS NULL AND voice_updated_at = ? AND
      (SELECT COUNT(*) FROM voice_calls WHERE id != ? AND state IN ('authorizing','ringing','connecting','active')) < ? AND
      (SELECT COUNT(*) FROM voice_calls WHERE user_id = ? AND state IN ('authorizing','ringing','connecting','active')) = 0`,
    )
    .bind(
      input.userId,
      input.updatedAt,
      JSON.stringify(input.value),
      input.id,
      input.expectedUpdatedAt,
      input.id,
      Math.max(1, input.maxConcurrentCalls),
      input.userId,
    )
    .run()
  return result.meta.changes === 1
}

function recoveryError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null
  return typeof value.error === 'string' ? value.error : null
}

export async function voiceLeaseCas(
  input: Readonly<{ payload: Payload; id: string; now: number; leaseUntil: number; value: unknown }>,
): Promise<boolean> {
  const { payload, id, now, leaseUntil, value } = input
  const db = adapter(payload)
  const collection = 'voiceEvents'
  const table = tableFor(db, collection)
  const status = voiceColumn(payload, collection, 'status')
  const lease = voiceColumn(payload, collection, 'leaseUntil')
  const idColumn = voiceColumn(payload, collection, 'id')
  const available = db.operators.or(
    db.operators.equals(status, 'pending'),
    db.operators.and(db.operators.equals(status, 'processing'), db.operators.less_than_equal(lease, now)),
  )
  const rows = await db.drizzle
    .update(table)
    .set({ status: 'processing', leaseUntil, value, updatedAt: new Date().toISOString() })
    .where(db.operators.and(db.operators.equals(idColumn, id), available))
    .returning({ id: idColumn })
  return rows.length === 1
}
