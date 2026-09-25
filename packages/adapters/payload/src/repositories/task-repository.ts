import type { TaskDatePatch, TaskPatch, TaskRepository, WorkRepository } from '@ops/module-work'
import type { StageStore } from '@ops/platform'
import type { CollectionSlug, PayloadRequest, Sort, Where } from 'payload'
import { COLLECTIONS, RECORD_TYPES } from '../contracts/names'
import { createAsSystem, findAsUser, updateIfUnchanged } from './local-api'
import { toStageRecord, toTaskRecord } from './task-mapping'
import { createUnitOfWork } from '../uow/unit-of-work'
import { projectData, taskData, projectPatchData, taskPatchData } from './task-write-data'
import { activityData, transitionData } from './stage-codecs'
import {
  taskPage,
  taskPageWithNullsLast,
  richTasks,
  findWorkflow,
  mapProject,
  mapTask,
  type TaskPageResult,
} from './task-queries'

const STAGE_COLLECTIONS: ReadonlyMap<string, CollectionSlug> = new Map([
  [RECORD_TYPES.tasks, COLLECTIONS.tasks],
  [RECORD_TYPES.projects, COLLECTIONS.projects],
])
const byId = (id: string): Where => ({ id: { equals: id } })

type Repository = TaskRepository & WorkRepository

export interface TaskPageQuery {
  readonly where: Where
  readonly sort: Sort
  readonly page: number
  readonly limit: number
  readonly dueAtNullsLast?: boolean
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
    addTransition: async (transition) => {
      await createAsSystem(req, COLLECTIONS.stageTransitions, transitionData(transition))
    },
    addActivity: async (entry) => {
      await createAsSystem(req, COLLECTIONS.activity, activityData(entry))
    },
  }
}
async function updateTaskAndMap(
  req: PayloadRequest,
  options: {
    readonly id: string
    readonly patch: TaskPatch | TaskDatePatch
    readonly expectedUpdatedAt: number
  },
) {
  const doc = await updateIfUnchanged(req, {
    collection: COLLECTIONS.tasks,
    id: options.id,
    expectedUpdatedAt: options.expectedUpdatedAt,
    data: taskPatchData(options.patch),
  })
  return doc === undefined ? undefined : mapTask(req, doc)
}

/** Reads one permission-scoped task page without materializing the entire task collection. */
export async function listTaskPage(req: PayloadRequest, query: TaskPageQuery): Promise<TaskPageResult> {
  if (query.dueAtNullsLast !== true) {
    return taskPage(req, { where: query.where, sort: query.sort, page: query.page, limit: query.limit })
  }

  return taskPageWithNullsLast(req, { where: query.where, sort: query.sort, page: query.page, limit: query.limit })
}

function workflowMethods(req: PayloadRequest): Pick<Repository, 'loadTaskWorkflow' | 'loadDefaultWorkflow'> {
  return {
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
  }
}

function listTasksMethods(req: PayloadRequest): Pick<Repository, 'listTasks' | 'listTasksForProject' | 'listChildren'> {
  return {
    listTasks: async () => {
      const docs = await findAsUser(req, { collection: COLLECTIONS.tasks, where: {}, sort: ['rank', 'id'] })
      return richTasks(req, docs)
    },
    listTasksForProject: async (projectId) => {
      const docs = await findAsUser(req, {
        collection: COLLECTIONS.tasks,
        where: { project: { equals: projectId } },
        sort: ['rank', 'id'],
      })
      return richTasks(req, docs)
    },
    listChildren: async (parentTaskId) => {
      const docs = await findAsUser(req, {
        collection: COLLECTIONS.tasks,
        where: { parentTask: { equals: parentTaskId } },
        sort: ['rank', 'id'],
      })
      return richTasks(req, docs)
    },
  }
}

function taskWriteMethods(
  req: PayloadRequest,
): Pick<Repository, 'getTask' | 'createTask' | 'updateTask' | 'saveDates' | 'deleteTask'> {
  return {
    getTask: async (id) => {
      const [doc] = await findAsUser(req, { collection: COLLECTIONS.tasks, where: byId(id), limit: 1 })
      return doc === undefined ? undefined : mapTask(req, doc)
    },
    createTask: async (draft) => {
      const doc = await createAsSystem(req, COLLECTIONS.tasks, taskData(draft))
      const mapped = await mapTask(req, doc)
      if (mapped === undefined) throw new Error('Created task has an invalid workflow stage')
      return mapped
    },
    updateTask: (id, patch, expectedUpdatedAt) => updateTaskAndMap(req, { id, patch, expectedUpdatedAt }),
    saveDates: async ({ id, startAt, dueAt, expectedUpdatedAt }) => {
      const doc = await updateIfUnchanged(req, {
        collection: COLLECTIONS.tasks,
        id,
        expectedUpdatedAt,
        data: { startAt, dueAt },
      })
      return doc === undefined ? undefined : toTaskRecord(doc)
    },
    deleteTask: async (id) => {
      const [doc] = await findAsUser(req, { collection: COLLECTIONS.tasks, where: byId(id), limit: 1 })
      if (doc === undefined) return false
      await req.payload.delete({ collection: COLLECTIONS.tasks, id, overrideAccess: true, req })
      return true
    },
  }
}

function projectMethods(
  req: PayloadRequest,
): Pick<Repository, 'getProject' | 'listProjects' | 'createProject' | 'updateProject'> {
  return {
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
      const doc = await createAsSystem(req, COLLECTIONS.projects, projectData(draft))
      const mapped = await mapProject(req, doc)
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
  }
}

function moveMethods(req: PayloadRequest): Pick<Repository, 'saveTaskMove'> {
  return {
    saveTaskMove: async (input) =>
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
  }
}

/** Payload Local API repository used by both the legacy board and the work vertical commands. */
export function createTaskRepository(req: PayloadRequest): Repository {
  const store = createStageStore(req)
  return {
    ...store,
    ...workflowMethods(req),
    ...listTasksMethods(req),
    ...taskWriteMethods(req),
    ...projectMethods(req),
    ...moveMethods(req),
  }
}

export type { TaskPageResult } from './task-queries'
