import { asId, ok } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { createProject, createTask, updateTask } from '../src'
import type { ProjectDraft, WorkRepository } from '../src'
import { actor, createMemoryRepo, depsFor, project, task } from './memory-work'

describe('task creation assignment', () => {
  it('lets staff assign an active teammate and rejects an inactive member', async () => {
    const staff = depsFor()
    const assigned = await createTask(staff, { title: 'teammate assignment', assigneeIds: [asId('other')] })
    expect(assigned.ok).toBe(true)

    const inactive = depsFor({ isActiveUser: () => Promise.resolve(false) })
    const rejected = await createTask(inactive, { title: 'inactive assignment', assigneeIds: [asId('other')] })
    expect(!rejected.ok && rejected.error.code).toBe('FORBIDDEN')
  })
})

describe('task reassignment', () => {
  it('lets staff reassign an accessible task to an active teammate but rejects an inactive target', async () => {
    const current = task('scoped', { updatedAt: 5 })
    let savedAssignees: readonly ReturnType<typeof asId>[] | undefined
    const repo: WorkRepository = {
      ...createMemoryRepo(),
      getTask: () => Promise.resolve(current),
      updateTask: (_id, patch) => {
        savedAssignees = 'assigneeIds' in patch ? patch.assigneeIds : undefined
        return Promise.resolve({ ...current, ...patch })
      },
    }
    const reassigned = await updateTask(depsFor({ repo }), {
      taskId: current.id,
      expectedUpdatedAt: 5,
      patch: { assigneeIds: [asId('teammate')] },
    })
    expect(reassigned.ok).toBe(true)
    expect(savedAssignees).toEqual([asId('teammate')])

    const rejected = await updateTask(depsFor({ repo, isActiveUser: () => Promise.resolve(false) }), {
      taskId: current.id,
      expectedUpdatedAt: 5,
      patch: { assigneeIds: [asId('inactive')] },
    })
    expect(!rejected.ok && rejected.error.code).toBe('FORBIDDEN')
    expect(savedAssignees).toEqual([asId('teammate')])
  })
})

describe('existing work permissions', () => {
  it('preserves manager assignment and project-owner permissions', async () => {
    const manager = depsFor({ actor: actor('manager', 'manager') })
    expect((await createTask(manager, { title: 'managed assignment', assigneeIds: [asId('other')] })).ok).toBe(true)

    let draft: ProjectDraft | undefined
    const repo: WorkRepository = {
      ...createMemoryRepo(),
      createProject: (input) => {
        draft = input
        return Promise.resolve(ok(project()))
      },
    }
    const ownerResult = await createProject(depsFor({ actor: actor('owner', 'owner'), repo }), {
      name: 'owned project',
      ownerId: asId('other'),
      memberIds: [asId('other')],
    })
    expect(ownerResult.ok).toBe(true)
    expect(draft?.ownerId).toBe(asId('other'))
  })
})
