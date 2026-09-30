import type { Payload } from 'payload'
import { PEOPLE_COLLECTIONS } from '../../collections/people/'
import { FIELDS } from '../../contracts/names'
import { fieldOf, idOf, msOf, textOf } from '../documents'
import type { JobCursor } from './cursor'
import type { JobTarget } from './job-targets'
import { isAfterCursor, withCursor } from './cursor'

export async function listDigestTargets(
  payload: Payload,
  input: { readonly limit: number; readonly cursor?: JobCursor | undefined },
): Promise<readonly JobTarget[]> {
  if (input.limit <= 0) return []
  const page = await payload.find({
    collection: PEOPLE_COLLECTIONS.notificationPrefs,
    where: withCursor([{ digestLocalTime: { exists: true } }], input.cursor),
    sort: 'updatedAt',
    limit: input.limit,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs
    .flatMap((doc) => {
      const ownerId = idOf(fieldOf(doc, FIELDS.user))
      const digestLocalTime = textOf(doc, 'digestLocalTime')
      const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
      return ownerId === undefined || digestLocalTime === undefined
        ? []
        : [
            {
              record: { type: 'user', id: ownerId },
              title: 'Daily digest',
              ownerId,
              digestLocalTime,
              ...(updatedAt === undefined ? {} : { updatedAt }),
            },
          ]
    })
    .filter((row) => isAfterCursor(row.updatedAt, row.record.id, input.cursor))
}
