import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { createTaskRepository } from '../../src/repositories'
import { fakeRequest, type Handlers } from './fake-payload'

const USER = { id: 'u1', role: 'staff', active: true }
const UPDATED = '2026-09-13T10:00:00.000Z'
const UPDATED_MS = Date.parse(UPDATED)
const CREATED = '2026-09-01T00:00:00.000Z'
const TASK_REF = { type: 'task', id: asId('t1') }
const GUARD = { and: [{ id: { equals: 't1' } }, { updatedAt: { equals: UPDATED } }] }
const SCOPED_READ = { overrideAccess: false, user: USER, depth: 0, pagination: false }

const taskDoc = (extra: object = {}) => ({
  id: 't1',
  title: 'Write brief',
  workflow: 'w1',
  stageId: 's-open',
  stageEnteredAt: 1000,
  createdAt: CREATED,
  updatedAt: UPDATED,
  priority: 'high',
  assignees: ['u1', 7],
  group: 'g1',
  startAt: 2000,
  dueAt: null,
  ...extra,
})

const workflowDoc = {
  id: 'w1',
  recordType: 'task',
  name: 'Tasks',
  defaultStageId: 's-open',
  stages: [
    { id: 's-done', name: 'Done', category: 'done_success', color: 'green', position: 1 },
    { id: 's-open', name: 'Open', category: 'open', color: 'blue', position: 0, probability: 10 },
  ],
}

function setup(handlers: Handlers = {}) {
  const fake = fakeRequest(USER, handlers)
  return { ...fake, repository: createTaskRepository(fake.req) }
}

describe('createTaskRepository listTasks', () => {
  it('reads with the user access and maps ISO timestamps and relationship ids', async () => {
    const docs = [taskDoc(), taskDoc({ id: 't2', workflow: null })]
    const { repository, calls, req } = setup({ find: () => ({ docs }) })
    expect(await repository.listTasks()).toEqual([
      {
        id: 't1',
        title: 'Write brief',
        workflowId: 'w1',
        stageId: 's-open',
        stageEnteredAt: 1000,
        updatedAt: UPDATED_MS,
        priority: 'high',
        assigneeIds: ['u1', '7'],
        startAt: 2000,
        dueAt: null,
      },
    ])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toMatchObject({ collection: 'tasks', ...SCOPED_READ })
    expect(calls[0]?.args['req']).toBe(req)
  })
})

describe('createTaskRepository loadRecord', () => {
  it('loads tasks and projects as stage-tracked records and ignores other record types', async () => {
    const project = { ...taskDoc({ id: 'p1', stageEnteredAt: null }), owner: 'u3', members: ['u4'] }
    const { repository, calls } = setup({
      find: (args) => ({ docs: [args['collection'] === 'projects' ? project : taskDoc()] }),
    })
    expect(await repository.loadRecord(TASK_REF)).toEqual({
      ref: TASK_REF,
      workflowId: 'w1',
      stageId: 's-open',
      stageEnteredAt: 1000,
      updatedAt: UPDATED_MS,
      assigneeIds: ['u1', '7'],
      groupId: 'g1',
    })
    expect(await repository.loadRecord({ type: 'project', id: asId('p1') })).toMatchObject({
      stageEnteredAt: Date.parse(CREATED),
      ownerId: 'u3',
      assigneeIds: ['u4'],
    })
    expect(await repository.loadRecord({ type: 'organization', id: asId('o1') })).toBeUndefined()
    expect(calls.map((call) => call.args)).toMatchObject([
      { collection: 'tasks', where: { id: { equals: 't1' } }, limit: 1, ...SCOPED_READ },
      { collection: 'projects', where: { id: { equals: 'p1' } }, limit: 1, ...SCOPED_READ },
    ])
  })
})

describe('createTaskRepository workflows', () => {
  it('maps workflows with stages in position order', async () => {
    const { repository, calls } = setup({ find: () => ({ docs: [workflowDoc] }) })
    const workflow = await repository.loadWorkflow(asId('w1'))
    expect(workflow).toEqual({
      id: 'w1',
      recordType: 'task',
      name: 'Tasks',
      defaultStageId: 's-open',
      stages: [
        { id: 's-open', name: 'Open', category: 'open', color: 'blue', position: 0, probability: 10 },
        { id: 's-done', name: 'Done', category: 'done_success', color: 'green', position: 1 },
      ],
    })
    expect(await repository.loadTaskWorkflow()).toEqual(workflow)
    expect(calls[1]?.args).toMatchObject({ collection: 'workflows', where: { recordType: { equals: 'task' } } })
  })

  it('fails when no task workflow exists', async () => {
    await expect(setup().repository.loadTaskWorkflow()).rejects.toThrow('No task workflow')
  })
})

describe('createTaskRepository compare-and-set writes', () => {
  it('saves the stage by id and expected updatedAt with the user access', async () => {
    const saved = taskDoc({ stageId: 's-done', stageEnteredAt: 5000, updatedAt: '2026-09-13T10:00:01.000Z' })
    const { repository, calls } = setup({ update: () => ({ docs: [saved], errors: [] }) })
    const input = { ref: TASK_REF, stageId: asId('s-done'), stageEnteredAt: 5000, expectedUpdatedAt: UPDATED_MS }
    expect(await repository.saveStage(input)).toMatchObject({ stageId: 's-done', updatedAt: UPDATED_MS + 1000 })
    expect(calls[0]?.args).toMatchObject({
      collection: 'tasks',
      where: GUARD,
      data: { stageId: 's-done', stageEnteredAt: 5000 },
      overrideAccess: false,
      user: USER,
    })
  })

  it('returns undefined when the compare-and-set matches no document', async () => {
    const { repository, calls } = setup()
    const dates = { id: asId('t1'), startAt: 1, dueAt: 2, expectedUpdatedAt: UPDATED_MS }
    expect(await repository.saveDates(dates)).toBeUndefined()
    expect(calls[0]?.args).toMatchObject({ where: GUARD, data: { startAt: 1, dueAt: 2 } })
    const invalid = { ref: TASK_REF, stageId: asId('s'), stageEnteredAt: 1, expectedUpdatedAt: Number.NaN }
    expect(await repository.saveStage(invalid)).toBeUndefined()
    expect(calls).toHaveLength(1)
  })

  it('rethrows per-document update failures', async () => {
    const { repository } = setup({ update: () => ({ docs: [], errors: [{ id: 't1', message: 'invalid dueAt' }] }) })
    const input = { id: asId('t1'), startAt: null, dueAt: -1, expectedUpdatedAt: UPDATED_MS }
    await expect(repository.saveDates(input)).rejects.toThrow('tasks update failed: invalid dueAt')
  })
})

describe('createTaskRepository audit writes', () => {
  it('writes activity as system work on the same request and skips transitions', async () => {
    const { repository, calls, req } = setup()
    await repository.addTransition({
      record: TASK_REF,
      workflowId: asId('w1'),
      fromStageId: asId('s-open'),
      toStageId: asId('s-done'),
      fromCategory: 'open',
      toCategory: 'done_success',
      changedBy: asId('u1'),
      changedAt: 1,
      durationMs: 1,
    })
    const entry = { record: TASK_REF, verb: 'stage.changed', actorId: asId('u1'), data: { a: 1 }, occurredAt: 9 }
    await repository.addActivity(entry)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toMatchObject({
      collection: 'activity',
      data: { recordType: 'task', recordId: 't1', verb: 'stage.changed', actor: 'u1', data: { a: 1 }, occurredAt: 9 },
      overrideAccess: true,
    })
    expect(calls[0]?.args['req']).toBe(req)
  })
})
