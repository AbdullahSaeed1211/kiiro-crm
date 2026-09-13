import { asId, fixedClock } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import type { Actor, Role } from '../../src/contracts/access'
import type { StageStore, UnitOfWork } from '../../src/contracts/ports'
import type { StageTrackedRecord } from '../../src/contracts/records'
import type { Workflow } from '../../src/contracts/workflows'
import { can } from '../../src/permissions/policy'
import { changeStage } from '../../src/workflows/change-stage'

const workflow: Workflow = {
  id: asId('workflow-1'),
  recordType: 'item',
  name: 'Flow',
  defaultStageId: asId('open'),
  stages: [
    { id: asId('open'), name: 'Open', category: 'open', color: 'blue', position: 0 },
    { id: asId('done'), name: 'Done', category: 'done_success', color: 'green', position: 1 },
  ],
}

interface Harness {
  readonly writes: string[]
  readonly store: StageStore
  readonly touch: () => void
}

function harness(): Harness {
  let record: StageTrackedRecord = {
    ref: { type: 'item', id: asId('record-1') },
    workflowId: workflow.id,
    stageId: asId('open'),
    stageEnteredAt: 1_000,
    updatedAt: 5_000,
    ownerId: asId('staff-1'),
  }
  const writes: string[] = []
  const store: StageStore = {
    loadRecord: (ref) => Promise.resolve(ref.id === record.ref.id ? record : undefined),
    loadWorkflow: () => Promise.resolve(workflow),
    saveStage: (input) => {
      if (input.expectedUpdatedAt !== record.updatedAt) return Promise.resolve(undefined)
      record = { ...record, stageId: input.stageId, stageEnteredAt: input.stageEnteredAt, updatedAt: 9_000 }
      writes.push(`stage:${input.stageId}`)
      return Promise.resolve(record)
    },
    addTransition: (transition) => {
      writes.push(`transition:${transition.fromCategory}->${transition.toCategory}:${String(transition.durationMs)}`)
      return Promise.resolve()
    },
    addActivity: (entry) => {
      writes.push(`activity:${entry.verb}`)
      return Promise.resolve()
    },
  }
  const touch = () => {
    record = { ...record, updatedAt: record.updatedAt + 1 }
  }
  return { writes, store, touch }
}

const uow: UnitOfWork = { run: (work) => work() }

function deps(store: StageStore, role: Role = 'staff') {
  const actor: Actor = { id: asId('staff-1'), role, groupIds: [], reportIds: [], active: true }
  return { actor, can, store, uow, clock: fixedClock(61_000) }
}

const move = { record: { type: 'item', id: asId('record-1') }, toStageId: asId('done'), expectedUpdatedAt: 5_000 }

describe('changeStage', () => {
  it('writes the stage, the transition with its duration and the activity, in that order', async () => {
    const { store, writes } = harness()
    const result = await changeStage(deps(store), move)
    expect(result.ok && result.value.stageId).toBe('done')
    expect(writes).toEqual(['stage:done', 'transition:open->done_success:60000', 'activity:stage.changed'])
  })

  it('returns the record without writes when the stage is unchanged', async () => {
    const { store, writes } = harness()
    const result = await changeStage(deps(store), { ...move, toStageId: asId('open') })
    expect(result.ok).toBe(true)
    expect(writes).toEqual([])
  })
})

describe('changeStage conflicts', () => {
  it('rejects a stale expectedUpdatedAt with CONFLICT and no writes', async () => {
    const { store, writes } = harness()
    const result = await changeStage(deps(store), { ...move, expectedUpdatedAt: 4_000 })
    expect(!result.ok && result.error.code).toBe('CONFLICT')
    expect(writes).toEqual([])
  })

  it('returns CONFLICT when the record changes between load and write', async () => {
    const { store, writes, touch } = harness()
    const racing: StageStore = {
      loadRecord: (ref) => store.loadRecord(ref),
      loadWorkflow: (id) => {
        touch()
        return store.loadWorkflow(id)
      },
      saveStage: (input) => store.saveStage(input),
      addTransition: (transition) => store.addTransition(transition),
      addActivity: (entry) => store.addActivity(entry),
    }
    const result = await changeStage(deps(racing), move)
    expect(!result.ok && result.error.code).toBe('CONFLICT')
    expect(writes).toEqual([])
  })
})

describe('changeStage rejections', () => {
  it('forbids staff outside the record scope', async () => {
    const { store } = harness()
    const outsider = { ...deps(store), actor: { ...deps(store).actor, id: asId('staff-2') } }
    const result = await changeStage(outsider, move)
    expect(!result.ok && result.error.code).toBe('FORBIDDEN')
  })

  it('rejects a stage outside the workflow and a missing record', async () => {
    const { store } = harness()
    const unknownStage = await changeStage(deps(store), { ...move, toStageId: asId('elsewhere') })
    const missing = await changeStage(deps(store), { ...move, record: { type: 'item', id: asId('nope') } })
    expect(!unknownStage.ok && unknownStage.error.code).toBe('VALIDATION')
    expect(!missing.ok && missing.error.code).toBe('NOT_FOUND')
  })
})
