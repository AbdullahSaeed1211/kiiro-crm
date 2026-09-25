/** Props contracts shared by the task sheet and its parts. */
export interface TaskSheetTask {
  readonly id: string
  readonly title: string
  readonly stage: string
  readonly stageCategory?: string
  readonly updatedAt?: number
  readonly priority: string
  readonly assignees: readonly string[]
  readonly startAt?: number | null
  readonly dueAt?: number | null
  readonly description?: string | null
  readonly subtasks?: readonly { readonly id: string; readonly title: string; readonly complete: boolean }[]
}

export type TaskSaveResult = Readonly<{ ok: true }> | Readonly<{ ok: false; error: string }>
export type SaveDescriptionParams = Readonly<{
  taskId: string
  expectedUpdatedAt: number
  description: string
}>
export type CompleteTaskParams = Readonly<{
  taskId: string
  expectedUpdatedAt: number
  reopen: boolean
}>
