import { asId, ok } from '@ops/kernel'
import { expect, it } from 'vitest'
import { createTodayTask } from '../src'
import type { WorkRepository } from '../src'
import { actor, createMemoryRepo, depsFor, task } from './memory-work'

function repoWithCreate(createTask: WorkRepository['createTask']): WorkRepository {
  return { ...createMemoryRepo(), createTask }
}

it('createTodayTask assigns the authenticated consultant and uses the workspace calendar date', async () => {
  let saved: Parameters<WorkRepository['createTask']>[0] | undefined
  const planned: Parameters<WorkRepository['addTaskToDayPlan']>[0][] = []
  const repo = repoWithCreate((draft) => {
    saved = draft
    return Promise.resolve(ok(task('today-task', draft)))
  })
  repo.addTaskToDayPlan = (entry) => {
    planned.push(entry)
    return Promise.resolve()
  }
  const result = await createTodayTask(
    depsFor({
      actor: { ...actor('staff'), workProfile: 'consultant' },
      repo,
      clock: { now: () => Date.parse('2026-11-01T03:30:00.000Z') },
    }),
    { title: 'Prepare proposal' },
    'America/New_York',
  )
  expect(result.ok).toBe(true)
  expect(saved).toMatchObject({
    title: 'Prepare proposal',
    assigneeIds: [asId('staff')],
    dueAt: null,
  })
  expect(planned).toEqual([
    { taskId: asId('today-task'), userId: asId('staff'), day: Date.parse('2026-10-31T00:00:00.000Z') },
  ])
})

it('createTodayTask rejects submitted ownership or date fields before writing', async () => {
  let writes = 0
  const repo = repoWithCreate(() => {
    writes += 1
    return Promise.resolve(ok(task('unexpected')))
  })
  const result = await createTodayTask(
    depsFor({ repo }),
    { title: 'Prepare proposal', assigneeIds: ['other'], dueAt: 1 },
    'UTC',
  )
  expect(!result.ok && result.error.code).toBe('VALIDATION')
  expect(writes).toBe(0)
})
