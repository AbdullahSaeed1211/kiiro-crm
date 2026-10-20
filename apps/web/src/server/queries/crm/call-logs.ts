import { asId } from '@ops/kernel'
import { listCallLogs } from '@ops/module-crm'
import { crmDeps, getRequestContext } from '@/server/container'

/** Reads call notes through the parent's CRM read permission. */
export async function loadCallLogs(recordType: 'lead' | 'contact', recordId: string) {
  const deps = await crmDeps()
  const result = await listCallLogs(deps, recordType, asId(recordId))
  if (!result.ok) return []
  const context = await getRequestContext()
  const page = await context.payload.find({
    collection: 'users',
    where: { id: { in: result.value.map((item) => item.callerId) } },
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: false,
    req: context.req,
  })
  const people = new Map(page.docs.map((user) => [user.id, typeof user.name === 'string' ? user.name : '']))
  return result.value.map((item) => ({ ...item, callerName: people.get(item.callerId) ?? '' }))
}
