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
    await createDoc(context, {
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
  }
}
