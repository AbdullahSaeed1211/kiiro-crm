import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { configureProjectMonthlyDesign, currentMonthlyDesignCycle, nextMonthlyDesignCycle } from '../src'
import type { MonthlyDesignConfig, WorkRepository } from '../src'
import { actor, createMemoryRepo, depsFor, project } from './memory-work'

const config: MonthlyDesignConfig = {
  enabled: true,
  title: 'Monthly design work order',
  assigneeIds: [asId('staff')],
  issueDay: 23,
  dueDay: 3,
  effectiveFrom: Date.parse('2026-12-23T12:00:00.000Z'),
}
const input = {
  projectId: 'project',
  expectedUpdatedAt: 1,
  enabled: true,
  title: 'Monthly design work order',
  assigneeIds: ['staff'],
  issueDay: 23,
  dueDay: 3,
}

describe('monthly design cycle dates', () => {
  it('issues on the activation day and carries the due date into the next year', () => {
    const cycle = currentMonthlyDesignCycle(config, Date.parse('2026-12-23T18:00:00.000Z'), 'UTC')
    expect(cycle).toMatchObject({ due: true, issueMonth: '2026-12' })
    expect(new Date(cycle.dueAt).toISOString()).toBe('2027-01-03T00:00:00.000Z')
  })

  it('clamps month ends consistently for previews', () => {
    const preview = nextMonthlyDesignCycle(
      { ...config, issueDay: 31, dueDay: 31, effectiveFrom: Date.parse('2026-04-01T00:00:00.000Z') },
      Date.parse('2026-04-20T12:00:00.000Z'),
      'UTC',
    )
    expect(preview).toMatchObject({ issueDate: '2026-04-30', dueDate: '2026-05-31' })
  })
})

describe('configureProjectMonthlyDesign manager write', () => {
  it('allows a manager to configure active project staff', async () => {
    let saved: MonthlyDesignConfig | undefined
    const repo: WorkRepository = {
      ...createMemoryRepo(),
      updateProjectMonthlyDesign: (_id, next) => {
        saved = next
        return Promise.resolve({ config: next, updatedAt: 2 })
      },
    }
    const result = await configureProjectMonthlyDesign(
      depsFor({
        actor: actor('manager', 'manager'),
        repo,
        isActiveUser: () => Promise.resolve(true),
        canReadProjectAsUser: () => Promise.resolve(true),
      }),
      input,
    )
    expect(result.ok).toBe(true)
    expect(saved).toMatchObject({ enabled: true, assigneeIds: [asId('staff')], effectiveFrom: 10 })
  })
})

describe('configureProjectMonthlyDesign validation', () => {
  it('rejects staff and invalid assignees without writing', async () => {
    let writes = 0
    const repo: WorkRepository = {
      ...createMemoryRepo(),
      updateProjectMonthlyDesign: (_id, next) => {
        writes += 1
        return Promise.resolve({ config: next, updatedAt: 2 })
      },
    }
    const staff = await configureProjectMonthlyDesign(depsFor({ actor: actor('staff'), repo }), input)
    const invalid = await configureProjectMonthlyDesign(
      depsFor({
        actor: actor('manager', 'manager'),
        repo,
        isActiveUser: () => Promise.resolve(false),
        canReadProjectAsUser: () => Promise.resolve(true),
      }),
      input,
    )
    const outside = await configureProjectMonthlyDesign(
      depsFor({
        actor: actor('manager', 'manager'),
        repo,
        isActiveUser: () => Promise.resolve(true),
        canReadProjectAsUser: () => Promise.resolve(true),
      }),
      { ...input, assigneeIds: ['other'] },
    )
    expect(staff).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
    expect(invalid).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(outside).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(writes).toBe(0)
  })
})

describe('configureProjectMonthlyDesign concurrency', () => {
  it('preserves effectiveFrom and reports compare-and-set conflicts', async () => {
    const previous: MonthlyDesignConfig = { ...config, title: 'Old title', effectiveFrom: 4 }
    const repo: WorkRepository = {
      ...createMemoryRepo(),
      getProject: () => Promise.resolve(project('project', { monthlyDesign: previous })),
      updateProjectMonthlyDesign: () => Promise.resolve(undefined),
    }
    const result = await configureProjectMonthlyDesign(
      depsFor({
        actor: actor('manager', 'manager'),
        repo,
        isActiveUser: () => Promise.resolve(true),
        canReadProjectAsUser: () => Promise.resolve(true),
      }),
      input,
    )
    expect(result).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
  })
})
