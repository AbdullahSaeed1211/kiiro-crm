/* eslint-disable max-lines, max-lines-per-function, no-nested-ternary, sonarjs/no-nested-conditional, @typescript-eslint/no-unsafe-assignment -- repository fixtures assert complete query and mutation contracts. */
import { asId } from '@ops/kernel'
import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'
import { createJobRunStore, createJobSources } from '../../src/repositories/job-store'

const AT = Date.UTC(2026, 8, 14, 12)
const OVERDUE_JOB = 'tasks.overdue'

interface PayloadCall {
  readonly method: 'find' | 'create' | 'update' | 'delete'
  readonly args: Readonly<Record<string, unknown>>
}

interface TestHandlers {
  readonly find?: (args: Readonly<Record<string, unknown>>) => unknown
  readonly create?: (args: Readonly<Record<string, unknown>>) => unknown
}

function handlerFor(method: PayloadCall['method'], handlers: TestHandlers) {
  if (method === 'find') return handlers.find
  if (method === 'create') return handlers.create
  return undefined
}

function testPayload(handlers: TestHandlers = {}) {
  const calls: PayloadCall[] = []
  const invoke = (method: PayloadCall['method'], args: Readonly<Record<string, unknown>>, fallback: unknown) => {
    calls.push({ method, args })
    const handler = handlerFor(method, handlers)
    return Promise.resolve().then(() => handler?.(args) ?? fallback)
  }
  const payload = {
    find: (args: Readonly<Record<string, unknown>>) => invoke('find', args, { docs: [] }),
    create: (args: Readonly<Record<string, unknown>>) => invoke('create', args, { id: 'created' }),
    update: (args: Readonly<Record<string, unknown>>) => invoke('update', args, {}),
    delete: (args: Readonly<Record<string, unknown>>) => invoke('delete', args, {}),
  } as unknown as Payload
  return { payload, calls }
}

function callsFor(handlers: TestHandlers) {
  const { payload, calls } = testPayload(handlers)
  return { store: createJobRunStore(payload), calls }
}

describe('createJobRunStore', () => {
  it('claims a window with its numeric start and skips an already-found run', async () => {
    const first = callsFor({ find: () => ({ docs: [] }) })
    expect(await first.store.claim(OVERDUE_JOB, `${OVERDUE_JOB}:1700000000000`)).toBe(true)
    expect(first.calls.map((call) => call.method)).toEqual(['find', 'create'])
    expect(first.calls[0]?.args).toMatchObject({
      collection: 'jobRuns',
      where: { and: [{ job: { equals: OVERDUE_JOB } }, { windowStart: { equals: 1700000000000 } }] },
      limit: 1,
      overrideAccess: true,
    })
    expect(first.calls[1]?.args).toMatchObject({
      collection: 'jobRuns',
      data: { job: OVERDUE_JOB, windowStart: 1700000000000, status: 'running' },
      overrideAccess: true,
    })

    const existing = callsFor({ find: () => ({ docs: [{ id: 'run-1' }] }) })
    expect(await existing.store.claim(OVERDUE_JOB, `${OVERDUE_JOB}:1700000000000`)).toBe(false)
    expect(existing.calls.map((call) => call.method)).toEqual(['find'])
  })

  it('treats a concurrent unique insert as a skipped claim and rethrows other errors', async () => {
    const duplicate = callsFor({
      find: () => ({ docs: [] }),
      create: () => {
        throw new Error('UNIQUE constraint failed: job_runs.job_window')
      },
    })
    expect(await duplicate.store.claim('digest.send', 'digest.send:7')).toBe(false)

    const failure = new Error('database unavailable')
    const other = callsFor({
      find: () => ({ docs: [] }),
      create: () => {
        throw failure
      },
    })
    await expect(other.store.claim('digest.send', 'digest.send:7')).rejects.toBe(failure)
  })

  it('reads and completes the latest run cursor, including clearing it', async () => {
    const { store, calls } = callsFor({
      find: (args) =>
        args['sort'] === '-windowStart'
          ? {
              docs: [
                { id: 'run-new', windowStart: AT, cursor: { id: 'deal-7', updatedAt: AT - 1 } },
                { id: 'run-old', windowStart: AT - 1, cursor: { id: 'lead-1', updatedAt: AT - 2 } },
              ],
            }
          : { docs: [] },
    })

    expect(await store.getCursor('records.stalled')).toEqual({ id: 'deal-7', updatedAt: AT - 1 })
    await store.saveCursor('records.stalled', { id: asId('deal-8'), updatedAt: AT })
    await store.saveCursor('records.stalled', undefined)
    expect(calls.filter((call) => call.method === 'update').map((call) => call.args)).toEqual([
      {
        collection: 'jobRuns',
        id: 'run-new',
        data: { cursor: { id: 'deal-8', updatedAt: AT }, status: 'completed' },
        overrideAccess: true,
      },
      {
        collection: 'jobRuns',
        id: 'run-new',
        data: { cursor: null, status: 'completed' },
        overrideAccess: true,
      },
    ])
  })

  it('ignores malformed cursors and does not update when no run exists', async () => {
    const malformed = callsFor({
      find: () => ({ docs: [{ id: 'run-1', windowStart: AT, cursor: { id: 42, updatedAt: 'later' } }] }),
    })
    expect(await malformed.store.getCursor(OVERDUE_JOB)).toBeUndefined()

    const absent = callsFor({ find: () => ({ docs: [] }) })
    await absent.store.saveCursor(OVERDUE_JOB, { id: 'task-1', updatedAt: AT })
    expect(absent.calls.map((call) => call.method)).toEqual(['find'])
  })

  it('reads continuation from the latest completed run after a new run is claimed', async () => {
    const { store, calls } = callsFor({
      find: (args) =>
        args['sort'] === '-windowStart'
          ? args['where'] && JSON.stringify(args['where']).includes('completed')
            ? { docs: [{ id: 'previous', status: 'completed', cursor: { id: 'task-9', updatedAt: AT - 1 } }] }
            : { docs: [{ id: 'current', status: 'running', cursor: null }] }
          : { docs: [] },
    })

    expect(await store.getCursor(OVERDUE_JOB)).toEqual({ id: 'task-9', updatedAt: AT - 1 })
    expect(calls[0]?.args).toMatchObject({
      where: { and: [{ job: { equals: OVERDUE_JOB } }, { status: { equals: 'completed' } }] },
      sort: '-windowStart',
    })
  })
})

describe('createJobSources', () => {
  it('lists and expires only valid pending invitations', async () => {
    const { payload, calls } = testPayload({
      find: () => ({
        docs: [{ id: 'invite-1', expiresAt: AT }, { id: 'invite-missing-expiry' }, { expiresAt: AT }],
      }),
    })
    const source = createJobSources(payload, 14)

    expect(await source.listExpiredInvitations(AT, 20)).toEqual([{ id: 'invite-1', expiresAt: AT }])
    expect(calls[0]?.args).toMatchObject({
      collection: 'invitations',
      where: { and: [{ status: { equals: 'pending' } }, { expiresAt: { less_than_equal: AT } }] },
      sort: 'expiresAt',
      limit: 20,
      overrideAccess: true,
    })
    await source.expireInvitation(asId('invite-1'))
    expect(calls[1]).toEqual({
      method: 'update',
      args: { collection: 'invitations', id: 'invite-1', data: { status: 'expired' }, overrideAccess: true },
    })
  })

  it('maps overdue tasks and daily digest preferences into job targets', async () => {
    const { payload, calls } = testPayload({
      find: (args) =>
        args['collection'] === 'tasks'
          ? {
              docs: [
                { id: 'task-1', title: 'Prepare proposal', assignees: ['u-1'], updatedAt: new Date(AT).toISOString() },
              ],
            }
          : args['collection'] === 'notificationPrefs'
            ? { docs: [{ user: 'u-2', digestLocalTime: '08:30' }, { user: 'u-3' }] }
            : { docs: [] },
    })
    const source = createJobSources(payload, 14)

    expect(await source.listOverdue(AT, 10)).toEqual([
      {
        record: { type: 'task', id: 'task-1' },
        title: 'Prepare proposal',
        assigneeIds: ['u-1'],
        updatedAt: AT,
      },
    ])
    expect(await source.listDigests('2026-09-14', AT, 10)).toEqual([
      { record: { type: 'user', id: 'u-2' }, title: 'Daily digest', ownerId: 'u-2', digestLocalTime: '08:30' },
    ])
    expect(calls[0]?.args).toMatchObject({ collection: 'workflows', where: { recordType: { in: ['task'] } } })
    expect(calls[1]?.args).toMatchObject({
      collection: 'tasks',
      where: { and: [{ dueAt: { less_than: AT } }] },
      sort: 'updatedAt',
    })
    expect(calls[2]?.args).toMatchObject({
      collection: 'notificationPrefs',
      where: { and: [{ digestLocalTime: { exists: true } }] },
      limit: 10,
      overrideAccess: true,
    })
  })

  it('queries leads and deals with the stalled cutoff and caps the combined result', async () => {
    const { payload, calls } = testPayload({
      find: (args) =>
        args['collection'] === 'workflows'
          ? { docs: [] }
          : args['collection'] === 'leads'
            ? { docs: [{ id: 'lead-1', name: 'Lead one', owner: 'u-1', updatedAt: new Date(AT).toISOString() }] }
            : args['collection'] === 'deals'
              ? { docs: [{ id: 'deal-1', title: 'Deal one', owner: 'u-2', updatedAt: new Date(AT).toISOString() }] }
              : { docs: [] },
    })
    const source = createJobSources(payload, 14)
    const cutoff = AT - 14 * 86_400_000

    expect(await source.listStalled(AT, 1)).toEqual([
      { record: { type: 'deal', id: 'deal-1' }, title: 'Deal one', ownerId: 'u-2', updatedAt: AT },
    ])
    expect(calls.map((call) => call.args)).toEqual([
      {
        collection: 'workflows',
        where: { recordType: { in: ['lead', 'deal', 'project'] } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      },
      {
        collection: 'leads',
        where: { and: [{ updatedAt: { less_than: new Date(cutoff).toISOString() } }] },
        sort: 'updatedAt',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      },
      {
        collection: 'deals',
        where: { and: [{ updatedAt: { less_than: new Date(cutoff).toISOString() } }] },
        sort: 'updatedAt',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      },
      {
        collection: 'projects',
        where: { and: [{ updatedAt: { less_than: new Date(cutoff).toISOString() } }] },
        sort: 'updatedAt',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      },
    ])
  })

  it('deletes rejected submissions and returns their continuation rows', async () => {
    const { payload, calls } = testPayload({
      find: () => ({
        docs: [
          { id: 'submission-1', receivedAt: AT - 1 },
          { id: 42, receivedAt: AT - 2 },
        ],
      }),
    })
    const source = createJobSources(payload, 14)

    expect(await source.deleteRejected(AT, 10)).toEqual({
      rows: [
        { id: 'submission-1', updatedAt: AT - 1 },
        { id: '42', updatedAt: AT - 2 },
      ],
    })
    expect(calls.map((call) => call.method)).toEqual(['find', 'delete', 'delete'])
    expect(calls[0]?.args).toMatchObject({
      collection: 'intakeSubmissions',
      where: { and: [{ receivedAt: { less_than: AT } }, { status: { in: ['rejected_spam', 'rejected_invalid'] } }] },
      sort: 'receivedAt',
      limit: 10,
      overrideAccess: true,
    })
    expect(calls.slice(1).map((call) => call.args)).toEqual([
      { collection: 'intakeSubmissions', id: 'submission-1', overrideAccess: true },
      { collection: 'intakeSubmissions', id: 42, overrideAccess: true },
    ])
  })

  it('filters overdue rows after the supplied cursor and excludes terminal task stages', async () => {
    const { payload, calls } = testPayload({
      find: (args) => {
        if (args['collection'] === 'workflows')
          return {
            docs: [
              {
                id: 'w1',
                recordType: 'task',
                defaultStageId: 'open',
                stages: [
                  { id: 'open', name: 'Open', category: 'open' },
                  { id: 'done', name: 'Done', category: 'done_success' },
                ],
              },
            ],
          }
        return {
          docs: [
            {
              id: 'terminal',
              title: 'Terminal',
              stageId: 'done',
              dueAt: AT - 2,
              updatedAt: new Date(AT - 2).toISOString(),
            },
            {
              id: 'before-cursor',
              title: 'Before',
              stageId: 'open',
              dueAt: AT - 2,
              updatedAt: new Date(AT - 2).toISOString(),
            },
            {
              id: 'after-cursor',
              title: 'After',
              stageId: 'open',
              dueAt: AT - 1,
              updatedAt: new Date(AT).toISOString(),
            },
          ],
        }
      },
    })
    const cursor = { id: 'before-cursor', updatedAt: AT - 2 }

    expect(await createJobSources(payload, 14).listOverdue(AT, 10, cursor)).toEqual([
      { record: { type: 'task', id: 'after-cursor' }, title: 'After', updatedAt: AT },
    ])
    expect(calls[1]?.args).toMatchObject({
      collection: 'tasks',
      where: {
        and: [
          { dueAt: { less_than: AT } },
          { or: [{ stageId: { not_in: ['done'] } }, { stageId: { exists: false } }] },
          { or: expect.any(Array) },
        ],
      },
    })
  })

  it('includes open projects and excludes terminal leads, deals and projects from stalled rows', async () => {
    const workflows = ['lead', 'deal', 'project'].map((recordType) => ({
      id: `workflow-${recordType}`,
      recordType,
      defaultStageId: 'open',
      stages: [
        { id: 'open', name: 'Open', category: 'open' },
        { id: 'closed', name: 'Closed', category: 'done_failure' },
      ],
    }))
    const { payload } = testPayload({
      find: (args) => {
        if (args['collection'] === 'workflows') return { docs: workflows }
        const type = args['collection'] === 'leads' ? 'lead' : args['collection'] === 'deals' ? 'deal' : 'project'
        return {
          docs: [
            {
              id: `${type}-closed`,
              name: `${type} closed`,
              title: `${type} closed`,
              owner: 'u1',
              stageId: 'closed',
              updatedAt: new Date(AT - 1).toISOString(),
            },
            {
              id: `${type}-open`,
              name: `${type} open`,
              title: `${type} open`,
              owner: 'u1',
              stageId: 'open',
              updatedAt: new Date(AT).toISOString(),
            },
          ],
        }
      },
    })

    expect(await createJobSources(payload, 14).listStalled(AT, 10)).toHaveLength(3)
    expect((await createJobSources(payload, 14).listStalled(AT, 10)).map((row) => row.record.type)).toEqual([
      'deal',
      'lead',
      'project',
    ])
  })
})
