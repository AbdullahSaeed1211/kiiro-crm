/* eslint-disable */
import type {
  ProjectDraft,
  ProjectPatch,
  ProjectRecord,
  TaskDatePatch,
  TaskDraft,
  TaskPatch,
  TaskRepository,
  TaskRecord,
  TaskMoveWrite,
  WorkRepository,
  WorkTaskRecord,
} from '@ops/module-work'
import type { StageStore, StageTransition, Workflow } from '@ops/platform'
import type { CollectionSlug, PayloadRequest, Sort, Where } from 'payload'
import { COLLECTIONS, FIELDS, RECORD_TYPES } from '../contracts/names'
import { createAsSystem, findAsUser, updateIfUnchanged } from './local-api'
import { fieldOf, idOf, type Doc } from './documents'
import { toProjectRecord, toStageRecord, toTaskRecord, toWorkTaskRecord } from './task-mapping'
import { toWorkflow } from './workflow-mapping'
import { createUnitOfWork } from '../uow/unit-of-work'

const STAGE_COLLECTIONS: ReadonlyMap<string, CollectionSlug> = new Map([
  [RECORD_TYPES.tasks, COLLECTIONS.tasks],
  [RECORD_TYPES.projects, COLLECTIONS.projects],
])
const byId = (id: string): Where => ({ id: { equals: id } })
const has = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)

export interface TaskPageQuery {
  readonly where: Where
  readonly sort: Sort
  readonly page: number
  readonly limit: number
  readonly dueAtNullsLast?: boolean
}

export interface TaskPageResult {
  readonly records: readonly TaskRecord[]
  readonly total: number
}

async function findWorkflow(req: PayloadRequest, where: Where): Promise<Workflow | undefined> {
  const [doc] = await findAsUser(req, { collection: COLLECTIONS.workflows, where, sort: 'createdAt', limit: 1 })
  return doc && toWorkflow(doc)
}
async function workflowFor(req: PayloadRequest, doc: Doc): Promise<Workflow | undefined> {
  const workflowId = idOf(fieldOf(doc, 'workflow'))
  return workflowId === undefined ? undefined : findWorkflow(req, byId(workflowId))
}
async function mapProject(req: PayloadRequest, doc: Doc): Promise<ProjectRecord | undefined> {
  const workflow = await workflowFor(req, doc)
  const stage = workflow?.stages.find((item) => item.id === idOf(fieldOf(doc, 'stageId')))
  return stage === undefined ? undefined : toProjectRecord(doc, stage.category)
}
async function mapTask(req: PayloadRequest, doc: Doc): Promise<WorkTaskRecord | undefined> {
  const workflow = await workflowFor(req, doc)
  const stage = workflow?.stages.find((item) => item.id === idOf(fieldOf(doc, 'stageId')))
  return stage === undefined ? undefined : toWorkTaskRecord(doc, stage.category)
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
      const doc = await updateIfUnchanged(req, {
        collection,
        id: ref.id,
        expectedUpdatedAt,
        data: { stageId, stageEnteredAt },
      })
      return doc && toStageRecord(ref.type, doc)
    },
    addTransition: () => Promise.resolve(),
    addActivity: async ({ record, verb, actorId, data, occurredAt }) => {
      await createAsSystem(req, COLLECTIONS.activity, {
        recordType: record.type,
        recordId: record.id,
        verb,
        actor: actorId,
        data,
        occurredAt,
      })
    },
  }
}
function projectData(draft: ProjectDraft): Record<string, unknown> {
  return {
    name: draft.name,
    organization: draft.organizationId ?? null,
    owner: draft.ownerId ?? null,
    members: [...(draft.memberIds ?? [])],
    workflow: draft.workflowId,
    stageId: draft.stageId,
    ...(draft.startAt === undefined ? {} : { startAt: draft.startAt }),
    ...(draft.targetEndAt === undefined ? {} : { targetEndAt: draft.targetEndAt }),
    ...(draft.description === undefined ? {} : { description: draft.description }),
  }
}
function taskData(draft: TaskDraft): Record<string, unknown> {
  return {
    title: draft.title,
    description: draft.description ?? null,
    project: draft.projectId ?? null,
    relatedType: draft.relatedType ?? null,
    relatedId: draft.relatedId ?? null,
    parentTask: draft.parentTaskId ?? null,
    workflow: draft.workflowId,
    stageId: draft.stageId,
    rank: draft.rank ?? '000000000001',
    priority: draft.priority ?? 'none',
    assignees: [...(draft.assigneeIds ?? [])],
    group: draft.groupId ?? null,
    startAt: draft.startAt ?? null,
    dueAt: draft.dueAt ?? null,
    completedAt: draft.completedAt ?? null,
  }
}
function transitionData({ record, workflowId, ...rest }: StageTransition): Record<string, unknown> {
  return { recordType: record.type, recordId: record.id, workflow: workflowId, ...rest }
}
function projectPatchData(patch: ProjectPatch): Record<string, unknown> {
  return {
    ...(has(patch, 'name') ? { name: patch.name } : {}),
    ...(has(patch, 'organizationId') ? { organization: patch.organizationId ?? null } : {}),
    ...(has(patch, 'startAt') ? { startAt: patch.startAt } : {}),
    ...(has(patch, 'targetEndAt') ? { targetEndAt: patch.targetEndAt } : {}),
    ...(has(patch, 'description') ? { description: patch.description } : {}),
    ...(has(patch, 'memberIds') ? { members: [...(patch.memberIds ?? [])] } : {}),
  }
}
function taskPatchData(patch: TaskPatch | TaskDatePatch): Record<string, unknown> {
  if (has(patch, 'startAt') || has(patch, 'dueAt')) {
    const dates = patch as TaskDatePatch
    return { startAt: dates.startAt, dueAt: dates.dueAt }
  }
  const editable = patch as TaskPatch
  return {
    ...(has(editable, 'title') ? { title: editable.title } : {}),
    ...(has(editable, 'description') ? { description: editable.description } : {}),
    ...(has(editable, 'priority') ? { priority: editable.priority } : {}),
    ...(has(editable, 'assigneeIds') ? { assignees: [...(editable.assigneeIds ?? [])] } : {}),
    ...(has(editable, 'groupId') ? { group: editable.groupId ?? null } : {}),
    ...(has(editable, 'relatedType') ? { relatedType: editable.relatedType } : {}),
    ...(has(editable, 'relatedId') ? { relatedId: editable.relatedId } : {}),
  }
}
async function updateTaskAndMap(
  req: PayloadRequest,
  id: string,
  patch: TaskPatch | TaskDatePatch,
  expectedUpdatedAt: number,
) {
  const doc = await updateIfUnchanged(req, {
    collection: COLLECTIONS.tasks,
    id,
    expectedUpdatedAt,
    data: taskPatchData(patch),
  })
  return doc === undefined ? undefined : mapTask(req, doc)
}

function andWhere(...clauses: readonly Where[]): Where {
  return clauses.length === 1 ? (clauses[0] ?? {}) : { and: [...clauses] }
}

async function taskPage(
  req: PayloadRequest,
  where: Where,
  sort: Sort,
  page: number,
  limit: number,
): Promise<TaskPageResult> {
  const result = await req.payload.find({
    collection: COLLECTIONS.tasks,
    where,
    sort,
    page,
    limit,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  return { records: result.docs.flatMap((doc) => toTaskRecord(doc) ?? []), total: result.totalDocs }
}

/** Reads one permission-scoped task page without materializing the entire task collection. */
export async function listTaskPage(req: PayloadRequest, query: TaskPageQuery): Promise<TaskPageResult> {
  if (query.dueAtNullsLast !== true) return taskPage(req, query.where, query.sort, query.page, query.limit)

  const withDue = andWhere(query.where, { dueAt: { not_equals: null } })
  const withoutDue = andWhere(query.where, { dueAt: { equals: null } })
  const [withDueCount, withoutDueCount] = await Promise.all([
    req.payload.count({ collection: COLLECTIONS.tasks, where: withDue, overrideAccess: false, user: req.user, req }),
    req.payload.count({
      collection: COLLECTIONS.tasks,
      where: withoutDue,
      overrideAccess: false,
      user: req.user,
      req,
    }),
  ])
  const total = withDueCount.totalDocs + withoutDueCount.totalDocs
  const offset = (query.page - 1) * query.limit
  if (offset >= total) return { records: [], total }

  const records: TaskRecord[] = []
  if (offset < withDueCount.totalDocs) {
    const firstPage = await taskPage(req, withDue, query.sort, Math.floor(offset / query.limit) + 1, query.limit)
    records.push(...firstPage.records.slice(offset % query.limit, (offset % query.limit) + query.limit))
  }

  if (records.length < query.limit && offset + records.length >= withDueCount.totalDocs) {
    const noDueOffset = Math.max(0, offset - withDueCount.totalDocs)
    const remaining = query.limit - records.length
    const noDuePage = await taskPage(req, withoutDue, 'id', Math.floor(noDueOffset / query.limit) + 1, query.limit)
    records.push(...noDuePage.records.slice(noDueOffset % query.limit, (noDueOffset % query.limit) + remaining))
  }
  return { records, total }
}

/** Payload Local API repository used by both the legacy board and the work vertical commands. */
export function createTaskRepository(req: PayloadRequest): TaskRepository & WorkRepository {
  const store = createStageStore(req)
  const richTasks = async (docs: readonly Doc[]) =>
    (await Promise.all(docs.map((doc) => mapTask(req, doc)))).flatMap((doc) => (doc === undefined ? [] : [doc]))
  return {
    ...store,
    loadTaskWorkflow: async () => {
      const workflow = await findWorkflow(req, { recordType: { equals: RECORD_TYPES.tasks } })
      if (workflow === undefined) throw new Error('No task workflow is configured')
      return workflow
    },
    loadDefaultWorkflow: async (type) => {
      const workflow = await findWorkflow(req, { recordType: { equals: type } })
      if (workflow === undefined) throw new Error(`No ${type} workflow is configured`)
      return workflow
    },
    listTasks: async (): Promise<readonly WorkTaskRecord[]> => {
      const docs = await findAsUser(req, { collection: COLLECTIONS.tasks, where: {}, sort: ['rank', 'id'] })
      return docs.flatMap((doc) => toTaskRecord(doc) ?? []) as unknown as WorkTaskRecord[]
    },
    listTasksForProject: async (projectId) =>
      richTasks(
        await findAsUser(req, {
          collection: COLLECTIONS.tasks,
          where: { project: { equals: projectId } },
          sort: ['rank', 'id'],
        }),
      ),
    listChildren: async (parentTaskId) =>
      richTasks(
        await findAsUser(req, {
          collection: COLLECTIONS.tasks,
          where: { parentTask: { equals: parentTaskId } },
          sort: ['rank', 'id'],
        }),
      ),
    getTask: async (id) => {
      const [doc] = await findAsUser(req, { collection: COLLECTIONS.tasks, where: byId(id), limit: 1 })
      return doc === undefined ? undefined : mapTask(req, doc)
    },
    createTask: async (draft) => {
      const mapped = await mapTask(req, await createAsSystem(req, COLLECTIONS.tasks, taskData(draft)))
      if (mapped === undefined) throw new Error('Created task has an invalid workflow stage')
      return mapped
    },
    updateTask: (id, patch, expectedUpdatedAt) => updateTaskAndMap(req, id, patch, expectedUpdatedAt),
    saveDates: async ({ id, startAt, dueAt, expectedUpdatedAt }) => {
      const doc = await updateIfUnchanged(req, {
        collection: COLLECTIONS.tasks,
        id,
        expectedUpdatedAt,
        data: { startAt, dueAt },
      })
      return doc === undefined ? undefined : toTaskRecord(doc)
    },
    getProject: async (id) => {
      const [doc] = await findAsUser(req, { collection: COLLECTIONS.projects, where: byId(id), limit: 1 })
      return doc === undefined ? undefined : mapProject(req, doc)
    },
    listProjects: async () => {
      const docs = await findAsUser(req, { collection: COLLECTIONS.projects, where: {}, sort: 'name' })
      return (await Promise.all(docs.map((doc) => mapProject(req, doc)))).flatMap((doc) =>
        doc === undefined ? [] : [doc],
      )
    },
    createProject: async (draft) => {
      const mapped = await mapProject(req, await createAsSystem(req, COLLECTIONS.projects, projectData(draft)))
      if (mapped === undefined) throw new Error('Created project has an invalid workflow stage')
      return mapped
    },
    updateProject: async (id, patch, expectedUpdatedAt) => {
      const doc = await updateIfUnchanged(req, {
        collection: COLLECTIONS.projects,
        id,
        expectedUpdatedAt,
        data: projectPatchData(patch),
      })
      return doc === undefined ? undefined : mapProject(req, doc)
    },
    saveTaskMove: async (input: TaskMoveWrite) =>
      createUnitOfWork(req).run(async () => {
        const doc = await updateIfUnchanged(req, {
          collection: COLLECTIONS.tasks,
          id: input.taskId,
          expectedUpdatedAt: input.expectedUpdatedAt,
          data: {
            stageId: input.toStageId,
            stageEnteredAt: input.stageEnteredAt,
            rank: input.rank,
            completedAt: input.completedAt,
          },
        })
        if (doc === undefined) return undefined
        await createAsSystem(req, COLLECTIONS.stageTransitions, transitionData(input.transition))
        return mapTask(req, doc)
      }),
    deleteTask: async (id) => {
      const [doc] = await findAsUser(req, { collection: COLLECTIONS.tasks, where: byId(id), limit: 1 })
      if (doc === undefined) return false
      await req.payload.delete({ collection: COLLECTIONS.tasks, id, overrideAccess: true, req })
      return true
    },
  }
}
