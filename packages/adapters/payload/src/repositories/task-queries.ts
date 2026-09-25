import type { PayloadRequest, Sort, Where } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import type { ProjectRecord, TaskRecord, WorkTaskRecord } from '@ops/module-work'
import { toProjectRecord, toTaskRecord, toWorkTaskRecord } from './task-mapping'
import { findAsUser } from './local-api'
import { fieldOf, idOf, type Doc } from './documents'
import { toWorkflow } from './workflow-mapping'

export interface TaskPageOptions {
  readonly where: Where
  readonly sort: Sort
  readonly page: number
  readonly limit: number
}

export interface TaskPageResult {
  readonly records: readonly TaskRecord[]
  readonly total: number
}

function andWhere(...clauses: readonly Where[]): Where {
  return clauses.length === 1 ? (clauses[0] ?? {}) : { and: [...clauses] }
}

export async function taskPage(req: PayloadRequest, options: TaskPageOptions): Promise<TaskPageResult> {
  const result = await req.payload.find({
    collection: COLLECTIONS.tasks,
    where: options.where,
    sort: options.sort,
    page: options.page,
    limit: options.limit,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  return { records: result.docs.flatMap((doc) => toTaskRecord(doc) ?? []), total: result.totalDocs }
}

/**
 * Count tasks matching a where clause.
 */
async function countTasks(req: PayloadRequest, where: Where): Promise<number> {
  const result = await req.payload.count({
    collection: COLLECTIONS.tasks,
    where,
    overrideAccess: false,
    user: req.user,
    req,
  })
  return result.totalDocs
}

/**
 * Paginate within a subset: handles offset when some results are in an earlier partition.
 * Returns the slice of records needed at the given offset/limit within the partition.
 */
async function pageWithinPartition(
  req: PayloadRequest,
  options: { where: Where; sort: Sort; partitionOffset: number; limit: number },
): Promise<TaskRecord[]> {
  const page = Math.floor(options.partitionOffset / options.limit) + 1
  const sliceStart = options.partitionOffset % options.limit
  const sliceEnd = sliceStart + options.limit
  const result = await taskPage(req, { where: options.where, sort: options.sort, page, limit: options.limit })
  return result.records.slice(sliceStart, sliceEnd)
}

export async function findWorkflow(req: PayloadRequest, where: Where) {
  const [doc] = await findAsUser(req, { collection: COLLECTIONS.workflows, where, sort: 'createdAt', limit: 1 })
  return doc ? toWorkflow(doc) : undefined
}

async function workflowFor(req: PayloadRequest, doc: Doc) {
  const workflowId = idOf(fieldOf(doc, 'workflow'))
  return workflowId === undefined ? undefined : findWorkflow(req, { id: { equals: String(workflowId) } })
}

export async function mapProject(req: PayloadRequest, doc: Doc): Promise<ProjectRecord | undefined> {
  const workflow = await workflowFor(req, doc)
  const stage = workflow?.stages.find((item) => item.id === idOf(fieldOf(doc, 'stageId')))
  return stage === undefined ? undefined : toProjectRecord(doc, stage.category)
}

export async function mapTask(req: PayloadRequest, doc: Doc): Promise<WorkTaskRecord | undefined> {
  const workflow = await workflowFor(req, doc)
  const stage = workflow?.stages.find((item) => item.id === idOf(fieldOf(doc, 'stageId')))
  return stage === undefined ? undefined : toWorkTaskRecord(doc, stage.category)
}

export async function richTasks(req: PayloadRequest, docs: readonly Doc[]): Promise<readonly WorkTaskRecord[]> {
  const workflowIds = [...new Set(docs.flatMap((doc) => idOf(fieldOf(doc, 'workflow')) ?? []))]
  if (workflowIds.length === 0) return []
  const workflowDocs = await findAsUser(req, {
    collection: COLLECTIONS.workflows,
    where: { id: { in: workflowIds } },
    limit: workflowIds.length,
  })
  const workflows = new Map(
    workflowDocs.flatMap((doc) => {
      const workflow = toWorkflow(doc)
      return workflow === undefined ? [] : [[String(workflow.id), workflow] as const]
    }),
  )
  return docs.flatMap((doc) => {
    const workflowId = idOf(fieldOf(doc, 'workflow'))
    const stageId = idOf(fieldOf(doc, 'stageId'))
    const stage =
      workflowId === undefined || stageId === undefined
        ? undefined
        : workflows.get(String(workflowId))?.stages.find((item) => item.id === stageId)
    if (stage === undefined) return []
    const task = toWorkTaskRecord(doc, stage.category)
    return task === undefined ? [] : [task]
  })
}

export async function taskPageWithNullsLast(
  req: PayloadRequest,
  options: { where: Where; sort: Sort; page: number; limit: number },
): Promise<TaskPageResult> {
  const withDue = andWhere(options.where, { dueAt: { not_equals: null } })
  const withoutDue = andWhere(options.where, { dueAt: { equals: null } })
  const [withDueCount, withoutDueCount] = await Promise.all([countTasks(req, withDue), countTasks(req, withoutDue)])
  const total = withDueCount + withoutDueCount
  const offset = (options.page - 1) * options.limit
  if (offset >= total) return { records: [], total }

  const records: TaskRecord[] = []
  if (offset < withDueCount) {
    const partition = await pageWithinPartition(req, {
      where: withDue,
      sort: options.sort,
      partitionOffset: offset,
      limit: options.limit,
    })
    records.push(...partition.slice(0, Math.min(partition.length, options.limit)))
  }

  if (records.length < options.limit && offset + records.length >= withDueCount) {
    const noDueOffset = Math.max(0, offset - withDueCount)
    const partition = await pageWithinPartition(req, {
      where: withoutDue,
      sort: 'id',
      partitionOffset: noDueOffset,
      limit: options.limit,
    })
    records.push(...partition.slice(0, options.limit - records.length))
  }

  return { records, total }
}
