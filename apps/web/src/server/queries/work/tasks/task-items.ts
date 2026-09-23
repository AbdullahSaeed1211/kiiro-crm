import type { TaskRecord } from '@ops/module-work'
import type { Workflow } from '@ops/platform'
import type { TaskListItem } from './types'

/** Name and email of users, keyed by id. */
export type PeopleById = ReadonlyMap<string, { readonly name: string; readonly email: string }>

const UNKNOWN_STAGE = { name: 'Unknown stage', color: 'gray', position: Number.MAX_SAFE_INTEGER } as const

interface TaskItemOptions {
  readonly workflow: Workflow
  readonly people: PeopleById
  readonly context?: TaskListItem['context']
}

/** Maps a task record to a tasks-list row with its workflow stage and the assignees the user can see. */
export function toTaskListItem(task: TaskRecord, options: TaskItemOptions): TaskListItem {
  const { workflow, people, context = null } = options
  const stage = workflow.stages.find((candidate) => candidate.id === task.stageId) ?? UNKNOWN_STAGE
  const assignees = task.assigneeIds.flatMap((id) => {
    const person = people.get(id)
    return person === undefined ? [] : [{ id, ...person }]
  })
  return {
    id: task.id,
    title: task.title,
    stage: { name: stage.name, color: stage.color, position: stage.position },
    priority: task.priority,
    assignees,
    dueAt: task.dueAt,
    context,
  }
}
