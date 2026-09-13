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

/** Writes `data` and `updatedAt` in one `UPDATE … WHERE id = ? AND updated_at = ? RETURNING id`; true when a row changed. */
export async function writeIfUnchanged(payload: Payload, write: VersionedWrite): Promise<boolean> {
  const db = drizzleAdapter(payload)
  const table = db.tables[db.tableNameMap.get(write.collection) ?? write.collection]
  if (table === undefined) throw new Error(`No table for collection ${write.collection}`)
  const values = { ...write.data, updatedAt: write.updatedAt }
  // Drizzle silently drops keys without a column, which would turn a misspelt field into a no-op write.
  for (const key of Object.keys(values)) columnOf(table, key)
  const id = columnOf(table, 'id')
  const { and, equals } = db.operators
  const guard = and(equals(id, write.id), equals(columnOf(table, 'updatedAt'), write.expectedUpdatedAt))
  const rows = await db.drizzle.update(table).set(values).where(guard).returning({ id })
  return rows.length > 0
}
