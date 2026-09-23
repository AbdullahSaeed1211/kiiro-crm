import { getWorkspaceSettings } from '../../auth/context'
import type { getRequestContext } from '../../work/deps'
import type { Where } from 'payload'

export type ReadPurpose = 'full' | 'dashboard' | 'projects' | 'reports'
type WorkContext = Awaited<ReturnType<typeof getRequestContext>>

function requestOptions(context: WorkContext) {
  return { depth: 0, limit: 0, pagination: false, overrideAccess: false as const, req: context.req }
}

function projectPage(context: WorkContext, request: ReturnType<typeof requestOptions>, purpose: ReadPurpose) {
  if (purpose === 'reports') return Promise.resolve(null)
  if (purpose === 'dashboard') {
    return context.payload.find({
      collection: 'projects',
      ...request,
      sort: 'name',
      select: { id: true, name: true, stageId: true },
    })
  }
  if (purpose === 'projects') {
    return context.payload.find({
      collection: 'projects',
      ...request,
      sort: 'name',
      select: { id: true, name: true, stageId: true, members: true, targetEndAt: true },
    })
  }
  return context.payload.find({ collection: 'projects', ...request, sort: 'name' })
}

function taskPage(context: WorkContext, request: ReturnType<typeof requestOptions>, purpose: ReadPurpose) {
  const select = getTaskSelect(purpose)
  return context.payload.find({
    collection: 'tasks',
    ...request,
    sort: 'rank',
    ...(select === undefined ? {} : { select }),
  })
}

function workflowPage(context: WorkContext, request: ReturnType<typeof requestOptions>, purpose: ReadPurpose) {
  const where: Where =
    purpose === 'reports'
      ? { recordType: { equals: 'task' } }
      : { or: [{ recordType: { equals: 'project' } }, { recordType: { equals: 'task' } }] }
  return context.payload.find({ collection: 'workflows', ...request, where })
}

function userPage(context: WorkContext, request: ReturnType<typeof requestOptions>, purpose: ReadPurpose) {
  if (purpose === 'dashboard') return Promise.resolve(null)
  const select = purpose === 'reports' || purpose === 'projects' ? { select: { id: true, name: true } as const } : {}
  return context.payload.find({ collection: 'users', ...request, ...select })
}

/** Fetches only the record groups and fields needed by each work surface. */
export async function loadWorkPages(context: WorkContext, purpose: ReadPurpose) {
  const request = requestOptions(context)
  const [projects, tasks, workflows, users, settings] = await Promise.all([
    projectPage(context, request, purpose),
    taskPage(context, request, purpose),
    workflowPage(context, request, purpose),
    userPage(context, request, purpose),
    getWorkspaceSettings(),
  ])
  return {
    projects: projects?.docs ?? [],
    tasks: tasks.docs,
    workflows: workflows.docs,
    users: users?.docs ?? [],
    settings,
  }
}

function getTaskSelect(purpose: ReadPurpose) {
  if (purpose === 'dashboard') {
    return { id: true, title: true, stageId: true, priority: true, dueAt: true, assignees: true } as const
  }
  if (purpose === 'projects') return { id: true, stageId: true, project: true } as const
  if (purpose === 'reports') {
    return {
      id: true,
      title: true,
      stageId: true,
      priority: true,
      dueAt: true,
      assignees: true,
      completedAt: true,
    } as const
  }
  return undefined
}
