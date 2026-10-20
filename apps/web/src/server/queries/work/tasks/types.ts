import type { StageColor } from '@ops/ui/composites/StagePill'
/** Task priority levels, shown with the icons of spec §15.4. */
type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

/** Columns the tasks list can sort by. */
export type TaskSortKey = 'title' | 'stage' | 'priority' | 'dueAt' | 'project'

/** Sort order requested through the `sort` URL key. */
export interface TaskSort {
  readonly key: TaskSortKey
  readonly desc: boolean
}

interface TaskStage {
  readonly name: string
  readonly color: StageColor
  readonly position: number
}

interface TaskAssignee {
  readonly id: string
  readonly name: string
  readonly email: string
}

/** One row of the tasks list read model. */
export interface TaskListItem {
  readonly id: string
  readonly title: string
  /** The version a change to this task must name, so two people editing at once do not overwrite each other. */
  readonly updatedAt: number
  readonly stage: TaskStage
  readonly priority: TaskPriority
  readonly assignees: readonly TaskAssignee[]
  /** UTC epoch milliseconds (decision D-09); null when the task has no due date. */
  readonly dueAt: number | null
  /** Project or related record the task belongs to. */
  readonly context: {
    readonly type: 'project' | 'organization' | 'contact' | 'lead' | 'deal'
    readonly label: string
    readonly href: string
  } | null
}

/** Page and sort requested by the tasks list. */
export interface TaskListQuery {
  readonly page: number
  readonly sort: TaskSort
  readonly view?: 'all' | 'open' | 'mine'
  /** Only tasks whose title has this text, ignoring case. */
  readonly search?: string
  /** Only tasks assigned to this person (a user id). */
  readonly assignee?: string
}

/** One page of tasks plus the total across all pages. */
export interface TaskListResult {
  readonly items: readonly TaskListItem[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}
