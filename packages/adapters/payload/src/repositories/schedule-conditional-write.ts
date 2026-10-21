import type { Payload } from 'payload'
import type { VersionedWrite } from './conditional-write'

interface Statement {
  bind(...values: readonly unknown[]): Statement
}
interface Binding {
  prepare(sql: string): Statement
  batch(statements: readonly Statement[]): Promise<readonly { readonly meta: { readonly changes: number } }[]>
}

const COLUMNS: Readonly<Record<string, string | undefined>> = {
  startsAt: 'starts_at',
  status: 'status',
  title: 'title',
  notes: 'notes',
}

function bindingOf(payload: Payload): Binding {
  const client: unknown = Reflect.get(payload.db, 'client')
  if (typeof client !== 'object' || client === null || !('prepare' in client && 'batch' in client))
    throw new Error('Schedule assignment updates require a D1 batch binding')
  return client as Binding
}

function assignmentIds(value: unknown): readonly string[] {
  if (!Array.isArray(value) || !value.every((id): id is string => typeof id === 'string'))
    throw new Error('Schedule assignees must be identifiers')
  return [...new Set(value)]
}

function rowUpdate(db: Binding, write: VersionedWrite): Statement {
  const fields = Object.entries(write.data).map(([key, value]) => {
    const column = COLUMNS[key]
    if (column === undefined) throw new Error(`Unsupported schedule column ${key}`)
    return { column, value }
  })
  const assignments = [...fields.map(({ column }) => `"${column}" = ?`), '"updated_at" = ?'].join(', ')
  return db
    .prepare(`UPDATE schedule_items SET ${assignments} WHERE id = ? AND updated_at = ?`)
    .bind(...fields.map(({ value }) => value), write.updatedAt, write.id, write.expectedUpdatedAt)
}

/** Atomically edits assignments and scalar fields; every statement checks the original version before the final CAS. */
export async function writeScheduleAssignments(
  payload: Payload,
  write: VersionedWrite,
  assignees: unknown,
): Promise<boolean> {
  const db = bindingOf(payload)
  const guard = 'EXISTS (SELECT 1 FROM schedule_items WHERE id = ? AND updated_at = ?)'
  const remove = db
    .prepare(`DELETE FROM schedule_items_rels WHERE parent_id = ? AND path = 'assignees' AND ${guard}`)
    .bind(write.id, write.id, write.expectedUpdatedAt)
  const additions = assignmentIds(assignees).map((id, index) =>
    db
      .prepare(
        `INSERT INTO schedule_items_rels ("order", parent_id, path, users_id) SELECT ?, ?, 'assignees', ? WHERE ${guard}`,
      )
      .bind(index + 1, write.id, id, write.id, write.expectedUpdatedAt),
  )
  // D1 batch is a transaction. Relations are guarded before the CAS, so equal proposed timestamps cannot claim another writer's result.
  const results = await db.batch([remove, ...additions, rowUpdate(db, write)])
  return (results.at(-1)?.meta.changes ?? 0) > 0
}
