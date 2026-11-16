import type { TaskRecord } from '@ops/module-work'
import type { Workflow } from '@ops/platform'
import type { TaskListItem } from './types'

/** Name and email of users, keyed by id. */
type PeopleById = ReadonlyMap<string, { readonly name: string; readonly email: string }>

const UNKNOWN_STAGE = {
  name: 'Unknown stage',
  color: 'gray',
  position: Number.MAX_SAFE_INTEGER,
  category: 'open',
} as const

interface TaskItemOptions {
  readonly workflow: Workflow
  readonly people: PeopleById
  readonly context?: TaskListItem['context']
}

function stageFor(task: TaskRecord, workflow: Workflow) {
  return workflow.stages.find((candidate) => candidate.id === task.stageId) ?? UNKNOWN_STAGE
}

function assigneesFor(task: TaskRecord, people: PeopleById) {
  return task.assigneeIds.flatMap((id) => {
    const person = people.get(id)
    return person === undefined ? [] : [{ id, ...person }]
  })
}

function primaryFor(task: TaskRecord, assignees: TaskListItem['assignees']) {
  const primaryId = task.primaryAssigneeId ?? task.assigneeIds.at(0) ?? null
  return primaryId === null ? null : (assignees.find((person) => person.id === String(primaryId)) ?? null)
}

function waitingOnName(task: TaskRecord, people: PeopleById): string | null {
  const id = task.waitingOnId
  return id === undefined || id === null ? null : (people.get(String(id))?.name ?? null)
}

/** Maps a task record to a tasks-list row with its workflow stage and the assignees the user can see. */
export function toTaskListItem(task: TaskRecord, options: TaskItemOptions): TaskListItem {
  const { workflow, people, context = null } = options
  const stage = stageFor(task, workflow)
  const assignees = assigneesFor(task, people)
  const primaryAssignee = primaryFor(task, assignees)
  return {
    id: task.id,
    title: task.title,
    updatedAt: task.updatedAt,
    stage: { name: stage.name, color: stage.color, position: stage.position },
    isFinished: ['done_success', 'done_failure', 'cancelled'].includes(stage.category),
    priority: task.priority,
    assignees,
    primaryAssignee,
    blocked: Boolean(task.blockedReason),
    blockedReason: task.blockedReason ?? null,
    waitingOn: waitingOnName(task, people),
    dueAt: task.dueAt,
    context,
  }
}
