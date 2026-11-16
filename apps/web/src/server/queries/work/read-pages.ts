import { getWorkspaceSettings } from '../../auth/context'
import type { getRequestContext } from '@/server/container'
import type { Where } from 'payload'

export type ReadPurpose = 'full' | 'dashboard' | 'projects' | 'reports' | 'assignments' | 'project-record'
type WorkContext = Awaited<ReturnType<typeof getRequestContext>>

function requestOptions(context: WorkContext) {
  return { depth: 0, limit: 0, pagination: false, overrideAccess: false as const, req: context.req }
}

function projectRecordPage(context: WorkContext, request: ReturnType<typeof requestOptions>, projectId: string) {
  return context.payload.find({
    collection: 'projects',
    ...request,
    where: { id: { equals: projectId } },
  })
}

function projectPage(
  context: WorkContext,
  request: ReturnType<typeof requestOptions>,
  input: Readonly<{ purpose: ReadPurpose; projectId?: string }>,
) {
  const { purpose, projectId } = input
  if (purpose === 'reports') return Promise.resolve(null)
  if (purpose === 'project-record') {
    if (projectId === undefined) throw new Error('A project ID is required for a project record read.')
    return projectRecordPage(context, request, projectId)
  }
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
  if (purpose === 'assignments') {
    return context.payload.find({
      collection: 'projects',
      ...request,
      sort: 'name',
      select: { id: true, name: true, stageId: true, owner: true, members: true, targetEndAt: true },
    })
  }
  return context.payload.find({ collection: 'projects', ...request, sort: 'name' })
}

function taskPage(
  context: WorkContext,
  request: ReturnType<typeof requestOptions>,
  input: Readonly<{ purpose: ReadPurpose; projectId?: string }>,
) {
  const { purpose, projectId } = input
  // The projects list asks for the tasks of the projects on its page only (see project-progress).
  if (purpose === 'projects') return Promise.resolve(null)
  const select = getTaskSelect(purpose)
  return context.payload.find({
    collection: 'tasks',
    ...request,
    ...(purpose === 'project-record' ? { where: { project: { equals: projectId } } } : {}),
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
  if (purpose === 'assignments' || purpose === 'projects') {
    // The active field is hidden from staff; these screens receive only active member names and IDs.
    return context.payload.find({
      collection: 'users',
      ...request,
      where: { active: { equals: true } },
      select: { id: true, name: true },
      overrideAccess: true,
    })
  }
  const select = purpose === 'reports' ? { select: { id: true, name: true } as const } : {}
  return context.payload.find({ collection: 'users', ...request, ...select })
}

/** Fetches only the record groups and fields needed by each work surface. */
export function loadWorkPages(context: WorkContext, purpose: ReadPurpose, projectId?: string) {
  return readWorkPageData(context, workPageInput(purpose, projectId))
}

async function readWorkPageData(context: WorkContext, input: Readonly<{ purpose: ReadPurpose; projectId?: string }>) {
  const { purpose } = input
  const request = requestOptions(context)
  const [projects, tasks, workflows, users, settings] = await Promise.all([
    projectPage(context, request, input),
    taskPage(context, request, input),
    workflowPage(context, request, purpose),
    userPage(context, request, purpose),
    getWorkspaceSettings(),
  ])
  return {
    projects: projects?.docs ?? [],
    tasks: tasks?.docs ?? [],
    workflows: workflows.docs,
    users: users?.docs ?? [],
    settings,
  }
}

function workPageInput(purpose: ReadPurpose, projectId?: string) {
  if (purpose === 'project-record' && projectId === undefined)
    throw new Error('A project ID is required for a project record read.')
  return { purpose, projectId }
}

function getTaskSelect(purpose: ReadPurpose) {
  if (purpose === 'dashboard') {
    return { id: true, title: true, stageId: true, priority: true, dueAt: true, assignees: true } as const
  }
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
  if (purpose === 'assignments') {
    return {
      id: true,
      title: true,
      stageId: true,
      assignees: true,
      project: true,
      dueAt: true,
    } as const
  }
  return undefined
}
