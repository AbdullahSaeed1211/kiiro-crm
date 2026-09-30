import type { RequestContext } from './container'

/** A user as a record page shows them. */
export interface PersonSummary {
  readonly id: string
  readonly name: string
  readonly email: string
}

/** The users with these ids as the signed-in user may read them, by id. Names come through the users collection's access. */
export async function loadPeople(
  { payload, req }: Pick<RequestContext, 'payload' | 'req'>,
  ids: readonly string[],
): Promise<ReadonlyMap<string, PersonSummary>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map()
  const result = await payload.find({
    collection: 'users',
    where: { id: { in: unique } },
    limit: unique.length,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  return new Map(result.docs.map((user) => [user.id, { id: user.id, name: user.name, email: user.email }]))
}
