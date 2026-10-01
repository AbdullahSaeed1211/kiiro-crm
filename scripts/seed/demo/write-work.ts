import { COLLECTIONS, at, createDoc, idFor, type WriteContext } from './context'
import type { DemoDataset } from './types'
import type { Workflows } from './write-base'

function stageRef(workflows: Workflows, recordType: 'project' | 'task', stage: string) {
  const found = workflows[recordType].stages.get(stage)
  if (found === undefined) throw new Error(`unknown ${recordType} stage ${stage}`)
  return { workflow: workflows[recordType].id, stageId: found.id }
}

export async function writeProjects(
  context: WriteContext,
  input: { readonly data: DemoDataset; readonly workflows: Workflows },
): Promise<void> {
  for (const project of input.data.projects) {
    await createDoc(context, {
      collection: COLLECTIONS.projects,
      key: project.key,
      day: project.startDay - 2,
      data: {
        name: project.name,
        description: project.description,
        organization: idFor(context, project.orgKey),
        owner: idFor(context, 'owner'),
        members: project.memberKeys.map((key) => idFor(context, key)),
        ...stageRef(input.workflows, 'project', project.stage),
        stageEnteredAt: at(context, project.startDay),
        startAt: at(context, project.startDay),
        targetEndAt: at(context, project.targetEndDay),
      },
    })
  }
}

export async function writeTasks(
  context: WriteContext,
  input: { readonly data: DemoDataset; readonly workflows: Workflows },
): Promise<void> {
  for (const [index, task] of input.data.tasks.entries()) {
    const done = task.stage === 'Done'
    const taskId = await createDoc(context, {
      collection: COLLECTIONS.tasks,
      day: task.startDay - 1,
      data: {
        title: task.title,
        description: task.description,
        ...stageRef(input.workflows, 'task', task.stage),
        stageEnteredAt: at(context, done ? task.dueDay - 1 : task.startDay),
        priority: task.priority,
        assignees: task.assigneeKeys.map((key) => idFor(context, key)),
        project: idFor(context, task.projectKey),
        startAt: at(context, task.startDay),
        dueAt: at(context, task.dueDay),
        completedAt: done ? at(context, task.dueDay - 1) : null,
        rank: String(index + 1000).padStart(6, '0'),
      },
    })
    await writeTime(context, { task, taskId, index })
  }
}

const SESSIONS = [30, 45, 60, 90, 120, 150, 180, 240] as const

/** Work done on finished and started tasks: one to three sessions by the people assigned, on days inside the task. */
async function writeTime(
  context: WriteContext,
  input: { readonly task: DemoDataset['tasks'][number]; readonly taskId: string; readonly index: number },
): Promise<void> {
  const { task, taskId, index } = input
  const started = !['To do', 'Backlog'].includes(task.stage) && task.assigneeKeys.length > 0
  if (!started || index % 3 === 0) return
  for (let session = 0; session <= index % 3; session += 1) {
    const person = task.assigneeKeys[(index + session) % task.assigneeKeys.length]
    if (person === undefined) continue
    const day = Math.min(-1, task.startDay + session + (index % 4))
    await createDoc(context, {
      collection: 'timeEntries',
      day,
      data: {
        task: taskId,
        user: idFor(context, person),
        minutes: SESSIONS[(index * 3 + session) % SESSIONS.length],
        day: at(context, day),
        note: session === 0 ? 'Started the work' : null,
      },
    })
  }
}
