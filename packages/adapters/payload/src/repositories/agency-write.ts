import type { Id } from '@ops/kernel'
import type { PayloadRequest } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, msOf, type Doc } from './documents'
import { partitionWrite, writeIfUnchanged } from './conditional-write'
import { findAsUser } from './local-api'
import { writeScheduleAssignments } from './schedule-conditional-write'

function writesAssignees(collection: string, related: Readonly<Record<string, unknown>>): boolean {
  const fields = Object.keys(related)
  if (fields.length === 0) return false
  if (collection !== COLLECTIONS.scheduleItems || fields.length !== 1 || fields[0] !== 'assignees')
    throw new Error('Unsupported agency relationship update')
  return true
}

/** Writes command-authorized agency records with parent-scoped reads and an atomic version check. */
export async function updateAgencyItemIfUnchanged(
  req: PayloadRequest,
  input: {
    readonly collection:
      typeof COLLECTIONS.deliverables | typeof COLLECTIONS.contentItems | typeof COLLECTIONS.scheduleItems
    readonly id: Id
    readonly expectedUpdatedAt: number
    readonly data: Readonly<Record<string, unknown>>
  },
): Promise<Doc | undefined> {
  const { collection, id, expectedUpdatedAt, data } = input
  const where = { id: { equals: id } }
  const [visible] = await findAsUser(req, { collection, where, limit: 1 })
  if (visible === undefined || msOf(fieldOf(visible, 'updatedAt')) !== expectedUpdatedAt) return undefined
  const expected = new Date(expectedUpdatedAt)
  if (Number.isNaN(expected.getTime())) return undefined
  const { columns, related } = partitionWrite(req.payload, collection, data)
  const hasAssignees = writesAssignees(collection, related)
  const updatedAt = new Date(Math.max(Date.now(), expected.getTime() + 1)).toISOString()
  const write = {
    collection,
    id,
    expectedUpdatedAt: expected.toISOString(),
    updatedAt,
    data: columns,
  }
  const written = hasAssignees
    ? await writeScheduleAssignments(req.payload, write, related['assignees'])
    : await writeIfUnchanged(req.payload, write)
  if (!written) return undefined
  const [saved] = await findAsUser(req, { collection, where, limit: 1 })
  return saved
}
