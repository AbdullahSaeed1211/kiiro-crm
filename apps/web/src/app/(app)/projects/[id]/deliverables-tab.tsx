import { asId } from '@ops/kernel'
import { workCommandDeps } from '@/server/container'
import { DeliverablesPanel } from './deliverables-panel'

export async function DeliverablesTab({
  projectId,
  people,
}: Readonly<{ projectId: string; people: ReadonlyMap<string, string> }>) {
  const deps = await workCommandDeps()
  const items = await deps.repo.listDeliverables(asId(projectId))
  return (
    <DeliverablesPanel
      projectId={projectId}
      initialItems={items.map((item) => ({
        ...item,
        ownerName: people.get(item.ownerId) ?? '',
        responderName: item.respondedBy === null ? null : (people.get(item.respondedBy) ?? null),
      }))}
    />
  )
}
