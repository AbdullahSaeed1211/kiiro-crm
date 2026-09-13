import type { RequestContext } from '../../work/deps'

export interface ActivityItem {
  readonly id: string
  readonly verb: string
  readonly occurredAt: number
  readonly actorName: string | null
  readonly data: Record<string, unknown>
}

export async function loadActivity(
  context: Pick<RequestContext, 'payload' | 'req'>,
  id: string,
): Promise<readonly ActivityItem[]> {
  const page = await context.payload.find({
    collection: 'activity',
    where: { and: [{ recordType: { equals: 'deal' } }, { recordId: { equals: id } }] },
    sort: '-occurredAt',
    limit: 30,
    pagination: false,
    depth: 0,
    overrideAccess: false,
    user: context.req.user,
    req: context.req,
  })
  return page.docs.map((item) => ({
    id: item.id,
    verb: typeof item.verb === 'string' ? item.verb : 'activity.updated',
    occurredAt: typeof item.occurredAt === 'number' ? item.occurredAt : new Date(String(item.occurredAt)).getTime(),
    actorName: null,
    data: typeof item.data === 'object' && item.data !== null ? (item.data as Record<string, unknown>) : {},
  }))
}
