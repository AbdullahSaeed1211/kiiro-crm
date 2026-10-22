import { asId } from '@ops/kernel'
import { getRequestContext, workCommandDeps } from '@/server/container'
import { getProductContext } from '@/server/auth/context'
import { DeliverablesPanel } from './deliverables-panel'

export async function DeliverablesTab({
  projectId,
  people,
}: Readonly<{ projectId: string; people: ReadonlyMap<string, string> }>) {
  const [context, productContext] = await Promise.all([getRequestContext(), getProductContext()])
  const deps = await workCommandDeps(context)
  const items = await deps.repo.listDeliverables(asId(projectId))
  const currentActorName = people.get(String(context.actor.id)) ?? productContext.user.name
  return (
    <DeliverablesPanel
      projectId={projectId}
      currentActorName={typeof currentActorName === 'string' ? currentActorName : ''}
      initialItems={items.map((item) => ({
        ...item,
        ownerName: people.get(item.ownerId) ?? '',
        responderName: item.respondedBy === null ? null : (people.get(item.respondedBy) ?? null),
      }))}
    />
  )
}
