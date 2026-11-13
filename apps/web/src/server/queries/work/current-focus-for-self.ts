import type { RequestContext } from '@/server/container'

function taskId(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value !== 'object' || value === null || !('id' in value)) return null
  const id: unknown = value.id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

/** Reads the viewer's one explicit focus row, once for a page that renders task actions. */
export async function currentFocusForSelf(context: RequestContext): Promise<string | null> {
  const result = await context.payload.find({
    collection: 'currentFocus',
    where: { user: { equals: String(context.actor.id) } },
    select: { task: true },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })
  return taskId(result.docs[0]?.task)
}
