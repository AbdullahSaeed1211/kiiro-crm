import type { Id } from '@ops/kernel'
import type { StageStore, StageTrackedRecord, StageTransition, Workflow } from '@ops/platform'
import type { PayloadRequest, Where } from 'payload'
import { COLLECTIONS, type CRM_FIELDS } from '../../contracts/names'
import { oneOf, type Doc } from '../documents'
import { createAsSystem, findAsUser, updateIfUnchanged } from '../local-api'
import { toWorkflow } from '../workflow-mapping'
import { CRM_COLLECTIONS, toCrmRecord } from './record-codecs'

const PIPELINE_TYPES = ['lead', 'deal'] as const

type PipelineType = (typeof PIPELINE_TYPES)[number]

type ActivityEntry = Parameters<StageStore['addActivity']>[0]

type TransitionField = (typeof CRM_FIELDS.stageTransition)[number]

/** Where clause matching one document id. */
export const whereId = (id: Id): Where => ({ id: { equals: id } })

/** The earliest created workflow matching `where`, read with the request user's access. */
export async function firstWorkflow(req: PayloadRequest, where: Where): Promise<Workflow | undefined> {
  const docs = await findAsUser(req, { collection: COLLECTIONS.workflows, where, sort: 'createdAt', limit: 1 })
  return docs.map((doc) => toWorkflow(doc)).find((workflow) => workflow !== undefined)
}

function toStageTracked(type: PipelineType, doc: Doc): StageTrackedRecord | undefined {
  const record = toCrmRecord(type, doc)
  if (record === undefined) return undefined
  const { id, workflowId, stageId, stageEnteredAt, updatedAt, ownerId, assigneeIds } = record
  const tracked = { ref: { type, id }, workflowId, stageId, stageEnteredAt, updatedAt, assigneeIds }
  return ownerId === null ? tracked : { ...tracked, ownerId }
}

function transitionData({ record, workflowId, ...rest }: StageTransition): Record<TransitionField, unknown> {
  return { recordType: record.type, recordId: record.id, workflow: workflowId, ...rest }
}

function activityData({ record, actorId, ...rest }: ActivityEntry): Record<string, unknown> {
  return { recordType: record.type, recordId: record.id, actor: actorId, ...rest }
}

async function dealStageData(input: {
  readonly req: PayloadRequest
  readonly id: Id
  readonly stageId: Id
  readonly stageEnteredAt: number
}): Promise<Record<string, unknown> | undefined> {
  const { req, id, stageId, stageEnteredAt } = input
  const [doc] = await findAsUser(req, { collection: COLLECTIONS.deals, where: whereId(id), limit: 1 })
  const deal = doc && toCrmRecord('deal', doc)
  if (deal === undefined) return undefined
  const workflow = await firstWorkflow(req, whereId(deal.workflowId))
  const stage = workflow?.stages.find((candidate) => candidate.id === stageId)
  if (stage === undefined) return undefined
  const terminal = stage.category === 'done_success' || stage.category === 'done_failure'
  return { stageId, stageEnteredAt, closedAt: terminal ? stageEnteredAt : null }
}

/**
 * `StageStore` for leads and deals: user-access reads and compare-and-set saves, system transition and activity rows.
 * Deal stage and `closedAt` change in the same conditional statement because D1 has no interactive transactions.
 */
export function createCrmStageStore(req: PayloadRequest): StageStore {
  return {
    loadRecord: async (ref) => {
      const type = oneOf(PIPELINE_TYPES, ref.type)
      if (type === undefined) return undefined
      const [doc] = await findAsUser(req, { collection: CRM_COLLECTIONS[type], where: whereId(ref.id), limit: 1 })
      return doc && toStageTracked(type, doc)
    },
    loadWorkflow: (id) => firstWorkflow(req, whereId(id)),
    saveStage: async ({ ref, stageId, stageEnteredAt, expectedUpdatedAt }) => {
      const type = oneOf(PIPELINE_TYPES, ref.type)
      if (type === undefined) return undefined
      const data =
        type === 'deal'
          ? await dealStageData({ req, id: ref.id, stageId, stageEnteredAt })
          : { stageId, stageEnteredAt }
      if (data === undefined) return undefined
      const doc = await updateIfUnchanged(req, {
        collection: CRM_COLLECTIONS[type],
        id: ref.id,
        expectedUpdatedAt,
        data,
      })
      return doc && toStageTracked(type, doc)
    },
    addTransition: async (transition) => {
      await createAsSystem(req, COLLECTIONS.stageTransitions, transitionData(transition))
    },
    addActivity: async (entry) => {
      await createAsSystem(req, COLLECTIONS.activity, activityData(entry))
    },
  }
}
