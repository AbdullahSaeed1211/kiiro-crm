import { describe, expect, it, vi } from 'vitest'
import type * as PayloadModule from 'payload'
import { runMonthlyDesignOrders } from '../../src/repositories/monthly-design'
import { fakePayload } from './fake-payload'

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof PayloadModule>()
  return {
    ...actual,
    createLocalReq: ({ user }: { readonly user: Readonly<Record<string, unknown>> }, payload: unknown) =>
      Promise.resolve({ user, payload }),
  }
})

const NOW = Date.parse('2026-10-23T12:00:00.000Z')
const DESIGNER = 'designer-1'
const JOB_COLLECTION = 'jobRuns'
const PROJECT = {
  id: 'project-1',
  owner: DESIGNER,
  members: [DESIGNER],
  workflow: 'project-flow',
  stageId: 'project-active',
  customData: {
    monthlyDesign: {
      enabled: true,
      title: 'Monthly design work order',
      assigneeIds: [DESIGNER],
      issueDay: 23,
      dueDay: 3,
      effectiveFrom: Date.parse('2026-09-01T00:00:00.000Z'),
    },
  },
}
const WORKFLOWS = [
  {
    id: 'project-flow',
    recordType: 'project',
    defaultStageId: 'project-active',
    stages: [{ id: 'project-active', name: 'Active', category: 'active', position: 0 }],
  },
  {
    id: 'task-flow',
    recordType: 'task',
    defaultStageId: 'task-open',
    stages: [{ id: 'task-open', name: 'Open', category: 'open', position: 0 }],
  },
]

function hasEquals(value: unknown, field: string, match: string): boolean {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  if (field in row) {
    const condition = row[field]
    return (
      typeof condition === 'object' && condition !== null && (condition as Record<string, unknown>)['equals'] === match
    )
  }
  return Object.values(row).some((child) => hasEquals(child, field, match))
}

function equalsValue(value: unknown, field: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined
  const row = value as Record<string, unknown>
  if (field in row) {
    const condition = row[field]
    return typeof condition === 'object' && condition !== null
      ? (condition as Record<string, unknown>)['equals']
      : undefined
  }
  return Object.values(row)
    .map((child) => equalsValue(child, field))
    .find((item) => item !== undefined)
}

function findHandler(state: ReturnType<typeof createState>) {
  return (args: Readonly<Record<string, unknown>>) => {
    switch (args['collection']) {
      case 'projects':
        return { docs: [PROJECT] }
      case 'workflows':
        return { docs: WORKFLOWS }
      case 'users':
        return { docs: [{ id: DESIGNER, role: 'staff', active: true, workProfile: 'delivery', groups: [] }] }
      case 'tasks':
        return {
          docs: state.tasks.filter((task) =>
            hasEquals(args['where'], 'monthlyOccurrenceKey', String(task['monthlyOccurrenceKey'])),
          ),
        }
      case JOB_COLLECTION:
        return { docs: matchingJobs(state.jobs, args) }
      case 'notifications':
        return {
          docs: state.notifications.filter((row) => hasEquals(args['where'], 'dedupeKey', String(row['dedupeKey']))),
        }
      default:
        return { docs: [] }
    }
  }
}

function createState() {
  return {
    tasks: [] as Record<string, unknown>[],
    jobs: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
    taskCreates: 0,
    notificationFails: 1,
  }
}

function attachSystemWriters(payload: object, state: ReturnType<typeof createState>, readable: boolean) {
  const mutablePayload = payload as {
    update(args: Readonly<Record<string, unknown>>): Promise<unknown>
    findByID(args: Readonly<Record<string, unknown>>): Promise<unknown>
  }
  mutablePayload.update = (args: Readonly<Record<string, unknown>>) => {
    const row = state.jobs.find((job) => job['id'] === args['id'])
    const data = args['data'] as Record<string, unknown>
    if (row !== undefined) Object.assign(row, data)
    return Promise.resolve(row)
  }
  mutablePayload.findByID = (args) =>
    args['user'] && !readable ? Promise.reject(new Error('forbidden')) : Promise.resolve({ id: args['id'] })
}

function setup(readable = true) {
  const state = createState()
  const { payload } = fakePayload({
    find: findHandler(state),
    create: (args) => createRecord(state, args),
  })
  attachSystemWriters(payload, state, readable)
  return { payload, state }
}

function matchingJobs(jobs: Record<string, unknown>[], args: Readonly<Record<string, unknown>>) {
  const where = args['where']
  const completedQuery = hasEquals(where, 'status', 'completed')
  const window = equalsValue(where, 'windowStart')
  const matches = jobs.filter(
    (row) =>
      row['job'] === 'work.monthlyDesign' &&
      (window === undefined || row['windowStart'] === window) &&
      (!completedQuery || row['status'] === 'completed'),
  )
  if (args['sort'] === '-windowStart')
    return matches.toSorted((a, b) => Number(b['windowStart']) - Number(a['windowStart'])).slice(0, 1)
  return matches
}

function createRecord(state: ReturnType<typeof setup>['state'], args: Readonly<Record<string, unknown>>) {
  const collection = args['collection']
  const data = args['data'] as Record<string, unknown>
  if (collection === 'tasks') {
    state.taskCreates += 1
    state.tasks.push({ id: `payload-task-${String(state.taskCreates)}`, ...data })
    throw new Error('Payload create failed', { cause: new Error('D1_ERROR: UNIQUE constraint failed: tasks.id') })
  }
  if (collection === 'notifications' && state.notificationFails > 0) {
    state.notificationFails -= 1
    throw new Error('temporary notification insert failure')
  }
  if (collection === 'notifications') state.notifications.push(data)
  if (collection === JOB_COLLECTION) state.jobs.push({ id: `job-${String(state.jobs.length + 1)}`, ...data })
  return { id: 'created' }
}

describe('runMonthlyDesignOrders create and notification retry', () => {
  it('recovers a wrapped unique task race and retries a failed assignment notice before advancing', async () => {
    const { payload, state } = setup()
    await expect(runMonthlyDesignOrders(payload, NOW, 'UTC')).rejects.toThrow('temporary notification insert failure')
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0]).toMatchObject({ id: 'payload-task-1', monthlyOccurrenceKey: 'project-1:2026-10' })
    expect(state.notifications).toHaveLength(0)

    const result = await runMonthlyDesignOrders(payload, NOW + 15 * 60_000, 'UTC')

    expect(result).toMatchObject({ processed: 1, created: 0, skipped: 1 })
    expect(state.taskCreates).toBe(1)
    expect(state.notifications).toHaveLength(1)
    expect(state.jobs.at(-1)).toMatchObject({ status: 'completed' })
  })

  it('does not notify an active former assignee who can no longer read the generated task', async () => {
    const { payload, state } = setup(false)
    const result = await runMonthlyDesignOrders(payload, NOW, 'UTC')
    expect(result.processed).toBe(1)
    expect(state.notifications).toHaveLength(0)
    expect(state.jobs.at(-1)).toMatchObject({ status: 'completed' })
  })

  it('does not recreate or notify a generated task that was archived after creation', async () => {
    const { payload, state } = setup()
    state.notificationFails = 0
    await runMonthlyDesignOrders(payload, NOW, 'UTC')
    const noticeCount = state.notifications.length
    const task = state.tasks.at(0)
    if (task === undefined) throw new Error('expected generated task')
    task['deletedAt'] = new Date(NOW).toISOString()

    const result = await runMonthlyDesignOrders(payload, NOW + 15 * 60_000, 'UTC')

    expect(result.processed).toBe(1)
    expect(state.taskCreates).toBe(1)
    expect(state.notifications).toHaveLength(noticeCount)
  })
})
