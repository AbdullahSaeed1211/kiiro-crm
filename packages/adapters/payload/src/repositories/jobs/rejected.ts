import type { Payload } from 'payload'
import { COLLECTIONS } from '../../contracts/names'
import { numberOf } from '../documents'
import type { JobCursor } from './cursor'
import { isAfterCursor, withCursor } from './cursor'

export async function purgeRejected(
  payload: Payload,
  input: { readonly before: number; readonly limit: number; readonly cursor?: JobCursor | undefined },
): Promise<{ readonly rows: readonly { readonly id: string; readonly updatedAt: number }[] }> {
  if (input.limit <= 0) return { rows: [] }
  const page = await payload.find({
    collection: COLLECTIONS.intakeSubmissions,
    where: withCursor(
      [{ receivedAt: { less_than: input.before } }, { status: { in: ['rejected_spam', 'rejected_invalid'] } }],
      input.cursor,
      'receivedAt',
    ),
    sort: 'receivedAt',
    limit: input.limit,
    depth: 0,
    overrideAccess: true,
  })
  for (const doc of page.docs)
    await payload.delete({ collection: COLLECTIONS.intakeSubmissions, id: doc.id, overrideAccess: true })
  return {
    rows: page.docs
      .map((doc) => ({ id: String(doc.id), updatedAt: numberOf(doc, 'receivedAt') ?? 0 }))
      .filter((row) => isAfterCursor(row.updatedAt, row.id, input.cursor)),
  }
}
