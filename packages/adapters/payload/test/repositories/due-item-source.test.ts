import { describe, expect, it } from 'vitest'
import { createDueItemSource } from '../../src/repositories'
import { fakePayload } from './fake-payload'

const FROM = 1_000
const TO = 2_000
const WINDOW = [{ dueAt: { greater_than_equal: FROM } }, { dueAt: { less_than: TO } }]

const workflow = {
  id: 'w1',
  recordType: 'task',
  name: 'Tasks',
  defaultStageId: 's-open',
  stages: [
    { id: 's-open', name: 'Open', category: 'open', color: 'blue', position: 0 },
    { id: 's-done', name: 'Done', category: 'done_success', color: 'green', position: 1 },
    { id: 's-lost', name: 'Dropped', category: 'cancelled', color: 'red', position: 2 },
  ],
}

const task = (id: string, dueAt: number | null, stageId: string | null = 's-open') => ({
  id,
  title: `Task ${id}`,
  stageId,
  dueAt,
  assignees: ['u1'],
})

function setup(workflows: readonly object[], tasks: readonly object[]) {
  const { payload, calls } = fakePayload({
    find: (args) => ({ docs: args['collection'] === 'workflows' ? workflows : tasks }),
  })
  return { source: createDueItemSource(payload), calls }
}

describe('createDueItemSource query', () => {
  it('queries open tasks in the window by due time as system work', async () => {
    const { source, calls } = setup([workflow], [])
    await source.listDueWithin(FROM, TO, 50)
    const open = { or: [{ stageId: { not_in: ['s-done', 's-lost'] } }, { stageId: { exists: false } }] }
    expect(calls.map((call) => call.args)).toMatchObject([
      { collection: 'workflows', where: { recordType: { equals: 'task' } }, overrideAccess: true },
      { collection: 'tasks', where: { and: [...WINDOW, open] }, sort: 'dueAt', limit: 50, overrideAccess: true },
    ])
  })

  it('omits the stage filter without terminal stages and reads nothing for a zero limit', async () => {
    const { source, calls } = setup([], [])
    await source.listDueWithin(FROM, TO, 10)
    expect(calls[1]?.args['where']).toEqual({ and: WINDOW })
    expect(await source.listDueWithin(FROM, TO, 0)).toEqual([])
    expect(calls).toHaveLength(2)
  })
})

describe('createDueItemSource results', () => {
  it('keeps only tasks with fromMs <= dueAt < toMs outside terminal stages', async () => {
    const docs = [
      task('at-start', FROM),
      task('no-stage', 1_500, null),
      task('done', 1_500, 's-done'),
      task('cancelled', 1_600, 's-lost'),
      task('at-end', TO),
      task('before', FROM - 1),
      task('undated', null),
    ]
    const { source } = setup([workflow], docs)
    expect(await source.listDueWithin(FROM, TO, 50)).toEqual([
      { record: { type: 'task', id: 'at-start' }, title: 'Task at-start', assigneeIds: ['u1'], dueAt: FROM },
      { record: { type: 'task', id: 'no-stage' }, title: 'Task no-stage', assigneeIds: ['u1'], dueAt: 1_500 },
    ])
  })
})
