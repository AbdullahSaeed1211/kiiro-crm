import type { TaskRepository } from '@ops/module-work'
import type { StageStore, Workflow } from '@ops/platform'
import type { CollectionSlug, PayloadRequest, Where } from 'payload'
import { COLLECTIONS, RECORD_TYPES } from '../contracts/names'
import { findAsUser, updateIfUnchanged } from './local-api'
import { toStageRecord, toTaskRecord } from './task-mapping'
import { toWorkflow } from './workflow-mapping'

const STAGE_COLLECTIONS: ReadonlyMap<string, CollectionSlug> = new Map([
  [RECORD_TYPES.tasks, COLLECTIONS.tasks],
  [RECORD_TYPES.projects, COLLECTIONS.projects],
])

const byId = (id: string): Where => ({ id: { equals: id } })

async function findWorkflow(req: PayloadRequest, where: Where): Promise<Workflow | undefined> {
  const [doc] = await findAsUser(req, { collection: COLLECTIONS.workflows, where, sort: 'createdAt', limit: 1 })
  return doc && toWorkflow(doc)
}

function createStageStore(req: PayloadRequest): StageStore {
  return {
    loadRecord: async (ref) => {
      const collection = STAGE_COLLECTIONS.get(ref.type)
      if (collection === undefined) return undefined
      const [doc] = await findAsUser(req, { collection, where: byId(ref.id), limit: 1 })
      return doc && toStageRecord(ref.type, doc)
    },
    loadWorkflow: (id) => findWorkflow(req, byId(id)),
    saveStage: async ({ ref, stageId, stageEnteredAt, expectedUpdatedAt }) => {
      const collection = STAGE_COLLECTIONS.get(ref.type)
      if (collection === undefined) return undefined
      const data = { stageId, stageEnteredAt }
      const doc = await updateIfUnchanged(req, { collection, id: ref.id, expectedUpdatedAt, data })
      return doc && toStageRecord(ref.type, doc)
    },
    // The spike has no stageTransitions collection; the `stage.changed` activity is the only audit row for now.
    addTransition: () => Promise.resolve(),
    addActivity: async ({ record, verb, actorId, data, occurredAt }) => {
      const activity = { recordType: record.type, recordId: record.id, verb, actor: actorId, data, occurredAt }
      await req.payload.create({
        collection: COLLECTIONS.activity,
        data: activity,
        depth: 0,
        overrideAccess: true,
        req,
      })
    },
  }
}

/** `TaskRepository` on the Payload Local API: reads and compare-and-set writes apply the request user's access. */
export function createTaskRepository(req: PayloadRequest): TaskRepository {
  return {
    ...createStageStore(req),
    loadTaskWorkflow: async () => {
      const workflow = await findWorkflow(req, { recordType: { equals: RECORD_TYPES.tasks } })
      if (workflow === undefined) throw new Error('No task workflow is configured')
      return workflow
    },
    listTasks: async () => {
      const docs = await findAsUser(req, { collection: COLLECTIONS.tasks, where: {}, sort: ['rank', 'id'] })
      return docs.flatMap((doc) => toTaskRecord(doc) ?? [])
    },
    saveDates: async ({ id, startAt, dueAt, expectedUpdatedAt }) => {
      const update = { collection: COLLECTIONS.tasks, id, expectedUpdatedAt, data: { startAt, dueAt } }
      const doc = await updateIfUnchanged(req, update)
      return doc && toTaskRecord(doc)
    },
  }
}
