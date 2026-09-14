import { describe, expect, it } from 'vitest'
import { DAY_MS, idOf, projectData, rankAt, stageIdsOf, taskData, userData, workflowData } from '../../seed/build'
import { GROUPS, PROJECT_WORKFLOW, PROJECTS, TASK_WORKFLOW, TASKS, USERS, type WorkflowSeed } from '../../seed/data'

const NOW = Date.UTC(2026, 8, 13)
const stageNames = (workflow: WorkflowSeed): string[] => workflow.stages.map((stage) => stage.name)
const unique = (values: readonly string[]): boolean => new Set(values).size === values.length
const ids = (keys: readonly string[]): Map<string, string> => new Map(keys.map((key) => [key, `id-${key}`]))

function counter(): () => string {
  let next = 0
  return () => {
    next += 1
    return `stage-${String(next)}`
  }
}

describe('seed data', () => {
  it('has twelve tasks due from -3 to +10 days, each starting on or before its due day', () => {
    expect(TASKS).toHaveLength(12)
    for (const task of TASKS) {
      expect(task.startDay).toBeGreaterThanOrEqual(-3)
      expect(task.dueDay).toBeLessThanOrEqual(10)
      expect(task.startDay).toBeLessThanOrEqual(task.dueDay)
    }
  })

  it('uses only existing stages and covers every task stage', () => {
    expect(new Set(TASKS.map((task) => task.stage))).toEqual(new Set(stageNames(TASK_WORKFLOW)))
    expect(PROJECTS.every((project) => stageNames(PROJECT_WORKFLOW).includes(project.stage))).toBe(true)
  })

  it('refers only to seeded users, groups and projects', () => {
    const keys = USERS.map((user) => user.key)
    const projectNames = PROJECTS.map((project) => project.name)
    for (const task of TASKS) {
      expect(task.assignees.every((key) => keys.includes(key))).toBe(true)
      expect(task.group === undefined || GROUPS.includes(task.group)).toBe(true)
      expect(task.project === undefined || projectNames.includes(task.project)).toBe(true)
    }
  })

  it('has unique names, emails and titles on example.test only', () => {
    expect(unique(USERS.map((user) => user.email))).toBe(true)
    expect(unique(USERS.map((user) => user.name))).toBe(true)
    expect(unique(TASKS.map((task) => task.title))).toBe(true)
    expect(unique([...GROUPS, ...PROJECTS.map((project) => project.name)])).toBe(true)
    expect(USERS.filter((user) => user.key !== 'owner').every((user) => user.email.endsWith('@example.test'))).toBe(true)
    expect(USERS.find((user) => user.key === 'owner')?.email).toBe('mirchads@gmail.com')
  })
})

describe('seed workflows', () => {
  it('follows the agency workflows of spec 18.1', () => {
    const summary = (workflow: WorkflowSeed): string[] =>
      workflow.stages.map((stage) => `${stage.name}/${stage.category}/${stage.color}`)
    expect(summary(TASK_WORKFLOW)).toEqual([
      'Backlog/backlog/gray',
      'To do/open/blue',
      'In progress/active/amber',
      'Review/waiting/violet',
      'Done/done_success/green',
    ])
    expect(summary(PROJECT_WORKFLOW)).toEqual([
      'Planned/backlog/gray',
      'In progress/active/blue',
      'On hold/waiting/amber',
      'Delivered/done_success/green',
      'Cancelled/cancelled/gray',
    ])
  })
})

describe('seed builders', () => {
  const workflow = { id: 'wf', stageIds: stageIdsOf(workflowData(TASK_WORKFLOW, counter())) }
  const context = { now: NOW, users: ids(USERS.map((user) => user.key)), workflow }

  it('gives every stage an id and makes the first stage the default', () => {
    const data = workflowData(PROJECT_WORKFLOW, counter())
    expect(data['defaultStageId']).toBe('stage-1')
    expect([...stageIdsOf(data).keys()]).toEqual(stageNames(PROJECT_WORKFLOW))
  })

  it('builds tasks with stage ids, epoch times and ranks in seed order', () => {
    const full = { ...context, groups: ids(GROUPS), projects: ids(PROJECTS.map((project) => project.name)) }
    const tasks = TASKS.map((task, index) => taskData(task, index, full))
    expect(tasks[0]).toMatchObject({ stageId: 'stage-5', dueAt: NOW - 2 * DAY_MS, assignees: ['id-staff1'] })
    const ranks = TASKS.map((_, index) => rankAt(index))
    expect(tasks.map((task) => task['rank'])).toEqual(ranks)
    expect([...ranks].sort((a, b) => a.localeCompare(b))).toEqual(ranks)
    expect(tasks.filter((task) => task['project'] === null)).toHaveLength(3)
  })

  it('links users to their group and manager, and projects to the manager', () => {
    const staff = USERS.find((user) => user.key === 'staff1')
    expect(staff && userData(staff, { users: context.users, groups: ids(GROUPS) })).toMatchObject({
      groups: ['id-Design'],
      reportsTo: 'id-manager',
    })
    const projectWorkflow = { id: 'pw', stageIds: stageIdsOf(workflowData(PROJECT_WORKFLOW, counter())) }
    const project = PROJECTS.map((seed) =>
      projectData(seed, { ...context, workflow: projectWorkflow, organization: 'org' }),
    )
    expect(project[0]).toMatchObject({ owner: 'id-manager', members: ['id-staff1'], stageId: 'stage-2' })
  })

  it('throws on an unknown reference', () => {
    expect(() => idOf(new Map(), 'missing')).toThrow(/missing/)
  })
})
