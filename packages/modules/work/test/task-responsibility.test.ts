import { asId, ok } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { createTask, updateTask } from '../src'
import type { WorkRepository } from '../src'
import { createMemoryRepo, depsFor, task } from './memory-work'

describe('task responsibility on create', () => {
  it('stores participant roles and sends one assignment notice to responsible people only', async () => {
    const created = task('created', {
      assigneeIds: [asId('other')],
      primaryAssigneeId: asId('other'),
      watcherIds: [asId('watcher')],
    })
    let draft: Parameters<WorkRepository['createTask']>[0] | undefined
    const notices: string[][] = []
    const repo: WorkRepository = {
      ...createMemoryRepo(),
      createTask: (input) => {
        draft = input
        return Promise.resolve(ok(created))
      },
    }
    const result = await createTask(
      depsFor({
        repo,
        notifyAssignment: (_record, ids) => {
          notices.push([...ids])
          return Promise.resolve()
        },
      }),
      { title: 'Delegated', primaryAssigneeId: 'other', watcherIds: ['watcher'] },
    )

    expect(result.ok).toBe(true)
    expect(draft).toMatchObject({
      primaryAssigneeId: asId('other'),
      collaboratorIds: [],
      watcherIds: [asId('watcher')],
      assignedById: asId('staff'),
    })
    expect(notices).toEqual([[asId('other')]])
  })
})

describe('task responsibility on update', () => {
  it('does not stamp or notify on watcher-only edits, then notifies when that watcher becomes responsible', async () => {
    const original = task('scoped', { updatedAt: 5, watcherIds: [asId('watcher')], assignedById: asId('previous') })
    const notices: string[] = []
    let lastPatch: Parameters<WorkRepository['updateTask']>[1] | undefined
    const repo: WorkRepository = {
      ...createMemoryRepo(),
      getTask: () => Promise.resolve(original),
      updateTask: (_id, patch) => {
        lastPatch = patch
        const watcherBecomesAssigned = 'primaryAssigneeId' in patch && patch.primaryAssigneeId === asId('watcher')
        const watcherIds = 'watcherIds' in patch ? patch.watcherIds : original.watcherIds
        return Promise.resolve({
          ...original,
          ...patch,
          assigneeIds: watcherBecomesAssigned ? [asId('watcher')] : original.assigneeIds,
          watcherIds: watcherBecomesAssigned ? [] : watcherIds,
        })
      },
    }
    const deps = depsFor({
      repo,
      notifyAssignment: (_record, ids) => {
        notices.push(...ids)
        return Promise.resolve()
      },
    })

    await updateTask(deps, { taskId: original.id, expectedUpdatedAt: 5, patch: { watcherIds: [] } })
    expect(lastPatch).not.toHaveProperty('assignedById')
    expect(notices).toEqual([])
    await updateTask(deps, {
      taskId: original.id,
      expectedUpdatedAt: 5,
      patch: { primaryAssigneeId: asId('watcher'), watcherIds: [] },
    })
    expect(notices).toEqual([asId('watcher')])
  })
})
