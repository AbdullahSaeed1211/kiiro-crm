import { currentMonthlyDesignCycle } from '@ops/module-work'
import type { Payload } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, type Doc } from './documents'
import { createJobRunStore } from './jobs/run-store'
import type { JobCursor } from './jobs/cursor'
import { assigneesStillEligible, monthlyConfig, projectTerminal } from './monthly-design-projects'
import { createOrRecoverMonthlyTask, notifyMonthlyTaskAssignees } from './monthly-design-tasks'
import { toWorkflow } from './workflow-mapping'

const PROJECT_BATCH_LIMIT = 100
const RUN_WINDOW_MS = 15 * 60 * 1000
const JOB_NAME = 'work.monthlyDesign'
type Workflows = Awaited<ReturnType<typeof workflowsFor>>['workflows']

async function projectBatch(payload: Payload, cursor: JobCursor | undefined): Promise<readonly Doc[]> {
  const projects = await payload.find({
    collection: COLLECTIONS.projects,
    where: cursor === undefined ? {} : { id: { greater_than: cursor.id } },
    sort: 'id',
    limit: PROJECT_BATCH_LIMIT,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return projects.docs
}

async function workflowsFor(payload: Payload) {
  const found = await payload.find({
    collection: COLLECTIONS.workflows,
    where: { recordType: { in: ['project', 'task'] } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const workflows = new Map(
    found.docs.flatMap((doc) => {
      const workflow = toWorkflow(doc)
      return workflow === undefined ? [] : [[String(workflow.id), workflow] as const]
    }),
  )
  const taskWorkflow = [...workflows.values()].find((workflow) => workflow.recordType === 'task')
  if (taskWorkflow === undefined) throw new Error('Monthly design requires a task workflow')
  return { workflows, taskWorkflow }
}

async function eligibleCycle(input: {
  readonly payload: Payload
  readonly project: Doc
  readonly workflows: Workflows
  readonly now: number
  readonly timeZone: string
}): Promise<ReturnType<typeof currentMonthlyDesignCycle> | undefined> {
  const config = monthlyConfig(input.project)
  const projectId = idOf(fieldOf(input.project, 'id'))
  if (
    projectId === undefined ||
    config === undefined ||
    !config.enabled ||
    projectTerminal(input.project, input.workflows) ||
    !(await assigneesStillEligible(input.payload, input.project, config))
  )
    return undefined
  const cycle = currentMonthlyDesignCycle(config, input.now, input.timeZone)
  return cycle.due ? cycle : undefined
}

function createMonthlyTask(input: {
  readonly payload: Payload
  readonly config: NonNullable<ReturnType<typeof monthlyConfig>>
  readonly projectId: string
  readonly cycle: NonNullable<Awaited<ReturnType<typeof eligibleCycle>>>
  readonly taskWorkflow: Awaited<ReturnType<typeof workflowsFor>>['taskWorkflow']
}) {
  return createOrRecoverMonthlyTask({
    payload: input.payload,
    config: input.config,
    projectId: input.projectId,
    issueMonth: input.cycle.issueMonth,
    dueAt: input.cycle.dueAt,
    workflowId: String(input.taskWorkflow.id),
    stageId: String(input.taskWorkflow.defaultStageId),
  })
}

const skipProject = () => ({ created: false, recovered: false, skipped: true, notices: 0 })

async function processProject(input: {
  readonly payload: Payload
  readonly project: Doc
  readonly workflows: Awaited<ReturnType<typeof workflowsFor>>['workflows']
  readonly taskWorkflow: Awaited<ReturnType<typeof workflowsFor>>['taskWorkflow']
  readonly now: number
  readonly timeZone: string
}): Promise<{
  readonly created: boolean
  readonly recovered: boolean
  readonly skipped: boolean
  readonly notices: number
}> {
  const projectId = idOf(fieldOf(input.project, 'id'))
  const config = monthlyConfig(input.project)
  if (projectId === undefined || config === undefined) return skipProject()
  const cycle = await eligibleCycle({
    payload: input.payload,
    project: input.project,
    workflows: input.workflows,
    now: input.now,
    timeZone: input.timeZone,
  })
  if (cycle === undefined) return skipProject()
  const task = await createMonthlyTask({
    payload: input.payload,
    config,
    projectId: String(projectId),
    cycle,
    taskWorkflow: input.taskWorkflow,
  })
  if (task === undefined || task.archived) return skipProject()
  const notices = await notifyMonthlyTaskAssignees({
    payload: input.payload,
    task: task.task,
    projectId: String(projectId),
    issueMonth: cycle.issueMonth,
  })
  return { created: task.created, recovered: !task.created && notices > 0, skipped: !task.created, notices }
}

function nextCursor(projects: readonly Doc[]): JobCursor | undefined {
  const lastId = idOf(fieldOf(projects.at(-1) ?? {}, 'id'))
  return projects.length === PROJECT_BATCH_LIMIT && lastId !== undefined
    ? { id: String(lastId), updatedAt: 0 }
    : undefined
}

function logProgress(input: {
  readonly processed: number
  readonly created: number
  readonly notifications: number
  readonly recovered: number
  readonly skipped: number
}) {
  if (input.created > 0 || input.notifications > 0 || input.recovered > 0) {
    console.info('[work.monthlyDesign]', {
      processedProjects: input.processed,
      createdTasks: input.created,
      createdAssignmentNotifications: input.notifications,
      recoveredTasks: input.recovered,
      skippedProjects: input.skipped,
    })
  }
}

async function processProjects(input: {
  readonly payload: Payload
  readonly projects: readonly Doc[]
  readonly workflows: Workflows
  readonly taskWorkflow: Awaited<ReturnType<typeof workflowsFor>>['taskWorkflow']
  readonly now: number
  readonly timeZone: string
}) {
  const totals = { created: 0, skipped: 0, notifications: 0, recovered: 0 }
  for (const project of input.projects) {
    const outcome = await processProject({
      payload: input.payload,
      project,
      workflows: input.workflows,
      taskWorkflow: input.taskWorkflow,
      now: input.now,
      timeZone: input.timeZone,
    })
    totals.created += Number(outcome.created)
    totals.skipped += Number(outcome.skipped)
    totals.notifications += outcome.notices
    totals.recovered += Number(outcome.recovered)
  }
  return totals
}

/** Creates at most one page of due monthly design orders and resumes by stable project ID on the next run. */
export async function runMonthlyDesignOrders(
  payload: Payload,
  now: number,
  timeZone: string,
): Promise<{ readonly processed: number; readonly created: number; readonly skipped: number }> {
  const runs = createJobRunStore(payload)
  const windowStart = Math.floor(now / RUN_WINDOW_MS) * RUN_WINDOW_MS
  if (!(await runs.claim(JOB_NAME, `${JOB_NAME}:${String(windowStart)}`)))
    return { processed: 0, created: 0, skipped: 0 }

  const projects = await projectBatch(payload, await runs.getCursor(JOB_NAME))
  const { workflows, taskWorkflow } = await workflowsFor(payload)
  const totals = await processProjects({ payload, projects, workflows, taskWorkflow, now, timeZone })
  await runs.saveCursor(JOB_NAME, nextCursor(projects))
  logProgress({
    processed: projects.length,
    ...totals,
  })
  return { processed: projects.length, created: totals.created, skipped: totals.skipped }
}
