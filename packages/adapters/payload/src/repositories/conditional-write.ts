import type { CollectionSlug, Payload } from 'payload'

/** A compare-and-set row write; timestamps are ISO strings, as Payload stores them. */
export interface VersionedWrite {
  readonly collection: CollectionSlug
  readonly id: string
  readonly expectedUpdatedAt: string
  readonly updatedAt: string
  readonly data: Readonly<Record<string, unknown>>
}

type Column = object
type Condition = object
type Table = Readonly<Record<string, Column | undefined>>

interface UpdateStatement {
  set(values: Readonly<Record<string, unknown>>): {
    where(condition: Condition): { returning(fields: Readonly<Record<string, Column>>): Promise<readonly unknown[]> }
  }
}

// Members every Payload Drizzle adapter (SQLite, D1, Postgres) carries; `payload.db` is typed without them.
interface DrizzleAdapter {
  readonly drizzle: { update(table: Table): UpdateStatement }
  readonly tables: Readonly<Record<string, Table | undefined>>
  readonly tableNameMap: ReadonlyMap<string, string>
  // Drizzle's free functions `and` and `eq`.
  readonly operators: {
    readonly and: (...conditions: Condition[]) => Condition
    readonly equals: (column: Column, value: unknown) => Condition
  }
}

function drizzleAdapter(payload: Payload): DrizzleAdapter {
  const db: object = payload.db
  if (!('drizzle' in db && 'tables' in db && 'tableNameMap' in db && 'operators' in db)) {
    throw new Error('Compare-and-set writes need a Payload Drizzle database adapter')
  }
  return db as DrizzleAdapter
}

function columnOf(table: Table, key: string): Column {
  const column = table[key]
  if (column === undefined) throw new Error(`No column for field ${key}`)
  return column
}

function tableOf(db: DrizzleAdapter, collection: CollectionSlug): Table {
  const table = db.tables[db.tableNameMap.get(collection) ?? collection]
  if (table === undefined) throw new Error(`No table for collection ${collection}`)
  return table
}

/** A write split by storage: keys with a column on the collection's table, and relationship keys kept in join tables. */
export interface PartitionedWrite {
  readonly columns: Readonly<Record<string, unknown>>
  readonly related: Readonly<Record<string, unknown>>
}

/**
 * Splits `data` into column keys and declared fields without a column (has-many relationships, which Payload stores in
 * a join table). Any other key throws, so a misspelt field cannot become a silent no-op.
 */
export function partitionWrite(
  payload: Payload,
  collection: CollectionSlug,
  data: Readonly<Record<string, unknown>>,
): PartitionedWrite {
  const table = tableOf(drizzleAdapter(payload), collection)
  const fields = payload.collections[collection]?.config.flattenedFields ?? []
  const columns: Record<string, unknown> = {}
  const related: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (table[key] !== undefined) columns[key] = value
    else if (fields.some((field) => field.name === key)) related[key] = value
    else throw new Error(`No column for field ${key}`)
  }
  return { columns, related }
}

/** Writes `data` and `updatedAt` in one `UPDATE … WHERE id = ? AND updated_at = ? RETURNING id`; true when a row changed. */
export async function writeIfUnchanged(payload: Payload, write: VersionedWrite): Promise<boolean> {
  const db = drizzleAdapter(payload)
  const table = tableOf(db, write.collection)
  const values = { ...write.data, updatedAt: write.updatedAt }
  // Drizzle silently drops keys without a column, which would turn a misspelt field into a no-op write.
  for (const key of Object.keys(values)) columnOf(table, key)
  const id = columnOf(table, 'id')
  const { and, equals } = db.operators
  const guard = and(equals(id, write.id), equals(columnOf(table, 'updatedAt'), write.expectedUpdatedAt))
  const rows = await db.drizzle.update(table).set(values).where(guard).returning({ id })
  return rows.length > 0
}
