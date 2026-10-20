import type { Id } from '@ops/kernel'
import type { PayloadRequest } from 'payload'
import type { COLLECTIONS } from '../contracts/names'
import { fieldOf, msOf, type Doc } from './documents'
import { partitionWrite, writeIfUnchanged } from './conditional-write'
import { findAsUser } from './local-api'

/** Writes command-authorized agency records with parent-scoped reads and an atomic version check. */
export async function updateAgencyItemIfUnchanged(
  req: PayloadRequest,
  input: {
    readonly collection: typeof COLLECTIONS.deliverables | typeof COLLECTIONS.contentItems
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
  if (Object.keys(related).length > 0) throw new Error('Agency work updates cannot write join-table fields.')
  const updatedAt = new Date(Math.max(Date.now(), expected.getTime() + 1)).toISOString()
  const written = await writeIfUnchanged(req.payload, {
    collection,
    id,
    expectedUpdatedAt: expected.toISOString(),
    updatedAt,
    data: columns,
  })
  if (!written) return undefined
  const [saved] = await findAsUser(req, { collection, where, limit: 1 })
  return saved
}
