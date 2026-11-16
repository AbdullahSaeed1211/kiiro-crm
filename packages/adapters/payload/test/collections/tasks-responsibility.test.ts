import { describe, expect, it } from 'vitest'
import { tasksCollection } from '../../src/collections/tasks'

const hook = tasksCollection.hooks?.beforeChange?.[1] as
  ((args: Record<string, unknown>) => Promise<Record<string, unknown>>) | undefined

async function normalize(data: Record<string, unknown>, originalDoc: Record<string, unknown> = {}) {
  if (hook === undefined) throw new Error('task responsibility hook is missing')
  return hook({
    data,
    originalDoc,
    operation: originalDoc['id'] === undefined ? 'create' : 'update',
    req: { user: null },
  })
}

describe('task responsibility hook legacy compatibility', () => {
  it('preserves legacy assignees on an unrelated update with expanded null canonical fields', async () => {
    const normalized = await normalize(
      { dueAt: 1000, primaryAssigneeId: null, collaboratorIds: [], watcherIds: [] },
      {
        id: 'task-1',
        assignees: ['user-1', 'user-2'],
        primaryAssigneeId: null,
        collaboratorIds: [],
        watcherIds: [],
        assignedById: 'creator-1',
      },
    )

    expect(normalized).toMatchObject({
      assignees: ['user-1', 'user-2'],
      primaryAssigneeId: 'user-1',
      collaboratorIds: ['user-2'],
      watcherIds: [],
      assignedById: 'creator-1',
    })
  })

  it('keeps an explicit canonical unassigned create unassigned', async () => {
    const normalized = await normalize({ assignees: [], primaryAssigneeId: null, collaboratorIds: [], watcherIds: [] })

    expect(normalized).toMatchObject({ assignees: [], primaryAssigneeId: null, collaboratorIds: [], watcherIds: [] })
  })
})
