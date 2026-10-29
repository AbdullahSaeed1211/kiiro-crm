import { asId, ok } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { createTodayTask } from '../src'
import type { WorkRepository } from '../src'
import { actor, createMemoryRepo, depsFor, task } from './memory-work'

function repoWithCreate(createTask: WorkRepository['createTask']): WorkRepository {
  return { ...createMemoryRepo(), createTask }
}

describe('createTodayTask', () => {
  it('assigns the authenticated consultant and uses the workspace calendar date', async () => {
    let saved: Parameters<WorkRepository['createTask']>[0] | undefined
    const repo = repoWithCreate((draft) => {
      saved = draft
      return Promise.resolve(ok(task('today-task', draft)))
    })
    const result = await createTodayTask(
      depsFor({
        actor: { ...actor('staff'), workProfile: 'consultant' },
        repo,
        clock: { now: () => Date.parse('2026-11-01T05:30:00.000Z') },
      }),
      { title: 'Prepare proposal' },
      'America/New_York',
    )
    expect(result.ok).toBe(true)
    expect(saved).toMatchObject({
      title: 'Prepare proposal',
      assigneeIds: [asId('staff')],
      dueAt: Date.parse('2026-11-01T00:00:00.000Z'),
    })
  })

  it('rejects submitted ownership or date fields before writing', async () => {
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
})
