import type { StageSelectLabels } from '../StageSelect/StageSelect'
import type { StageOption } from '../StagePill/stage'

/** Task priorities in display order (spec §10.2). */
export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

/** How a task repeats once completed, in display order. */
export const TASK_REPEATS = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const
export type TaskRepeat = (typeof TASK_REPEATS)[number]

/** One task as the sheet and the full page show it. */
export interface TaskSheetTask {
  readonly id: string
  readonly title: string
  readonly stageId: string
  readonly updatedAt: number
  readonly priority: TaskPriority
  readonly repeat: TaskRepeat
  readonly assigneeIds: readonly string[]
  /** The group the task belongs to, so everyone in it can see and work on it; null for none. */
  readonly groupId: string | null
  readonly startAt: number | null
  readonly dueAt: number | null
  readonly description: string | null
  readonly parent: Readonly<{ id: string; title: string }> | null
  readonly subtasks: readonly Readonly<{ id: string; title: string; complete: boolean; updatedAt: number }>[]
}

/** Choices and access the sheet needs besides the task itself. */
export interface TaskSheetOptions {
  readonly stages: readonly StageOption[]
  readonly members: readonly Readonly<{ id: string; name: string }>[]
  readonly groups: readonly Readonly<{ id: string; name: string }>[]
  /** False renders every property as text and hides the save controls. */
  readonly canUpdate: boolean
  /** BCP 47 locale for dates. */
  readonly locale: string
}

/** One edit the sheet asks the caller to save. */
export type TaskChange =
  | Readonly<{ kind: 'stage'; stageId: string }>
  | Readonly<{ kind: 'priority'; priority: TaskPriority }>
  | Readonly<{ kind: 'repeat'; repeat: TaskRepeat }>
  | Readonly<{ kind: 'assignees'; assigneeIds: readonly string[] }>
  | Readonly<{ kind: 'group'; groupId: string | null }>
  | Readonly<{ kind: 'dates'; startAt: number | null; dueAt: number | null }>
  | Readonly<{ kind: 'description'; description: string }>
  | Readonly<{ kind: 'complete'; reopen: boolean }>

/** One change to one task at the version the screen last saw. */
export type TaskChangeRequest = Readonly<{ taskId: string; expectedUpdatedAt: number; change: TaskChange }>

/** Outcome of a save; `fields` holds one message per invalid input, keyed by field name. */
export type TaskChangeResult =
  | Readonly<{ ok: true; updatedAt?: number }>
  | Readonly<{ ok: false; message: string; fields?: Readonly<Record<string, string>> }>

/** Saves wired by the app; every callback is required so no control silently does nothing. */
export interface TaskSheetActions {
  readonly onChange: (request: TaskChangeRequest) => Promise<TaskChangeResult>
  readonly onCreateSubtask: (parentTaskId: string, title: string) => Promise<TaskChangeResult>
  readonly taskHref: (taskId: string) => string
}

/** Translated copy of the task sheet. */
export type TaskSheetLabels = Readonly<{
  task: string
  properties: string
  stage: StageSelectLabels
  priority: string
  priorities: Readonly<Record<TaskPriority, string>>
  repeat: string
  repeats: Readonly<Record<TaskRepeat, string>>
  assignees: string
  unassigned: string
  group: string
  noGroup: string
  startDate: string
  dueDate: string
  noDate: string
  clearDate: string
  parent: string
  noParent: string
  description: string
  descriptionPlaceholder: string
  saveDescription: string
  saving: string
  saved: string
  subtasks: string
  noSubtasks: string
  addSubtask: string
  addSubtaskPlaceholder: string
  complete: string
  completing: string
  reopen: string
  reopening: string
  close: string
}>
