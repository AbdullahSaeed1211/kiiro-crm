import type { Clock, Id, Result } from '@ops/kernel'
import type { Actor, Can, StageStore, UnitOfWork, Workflow } from '@ops/platform'
import type { TaskPriority, TaskRecord as TaskPortRecord } from './tasks'

export type WorkRecordType = 'project' | 'task'
export interface ProjectRecord {
  readonly id: Id
  readonly name: string
  readonly organizationId: Id | null
  readonly ownerId: Id | null
  readonly memberIds: readonly Id[]
  readonly workflowId: Id
  readonly stageId: Id
  readonly stageEnteredAt: number
  readonly startAt: number | null
  readonly targetEndAt: number | null
  readonly description: string | null
  readonly createdAt: number
  readonly updatedAt: number
}

export interface WorkTaskRecord extends TaskPortRecord {
  readonly description: string | null
  readonly projectId: Id | null
  readonly relatedType: string | null
  readonly relatedId: Id | null
  readonly parentTaskId: Id | null
  readonly rank: string
  readonly groupId: Id | null
  readonly completedAt: number | null
  readonly createdAt: number
}

export interface ProjectDraft {
  readonly name: string
  readonly organizationId?: Id | null
  readonly ownerId?: Id | null
  readonly memberIds?: readonly Id[]
  readonly workflowId?: Id
  readonly stageId?: Id
  readonly startAt?: number | null
  readonly targetEndAt?: number | null
  readonly description?: string | null
}

export interface TaskDraft {
  readonly title: string
  readonly description?: string | null
  readonly projectId?: Id | null
  readonly relatedType?: string | null
  readonly relatedId?: Id | null
  readonly parentTaskId?: Id | null
  readonly workflowId?: Id
  readonly stageId?: Id
  readonly rank?: string
  readonly priority?: TaskPriority
  readonly assigneeIds?: readonly Id[]
  readonly groupId?: Id | null
  readonly startAt?: number | null
  readonly dueAt?: number | null
  readonly completedAt?: number | null
}

export interface WorkRepository extends StageStore {
  getProject(id: Id): Promise<ProjectRecord | undefined>
  listProjects(): Promise<readonly ProjectRecord[]>
  createProject(draft: ProjectDraft): Promise<ProjectRecord>
  updateProject(id: Id, patch: Partial<ProjectDraft>, expectedUpdatedAt: number): Promise<ProjectRecord | undefined>
  getTask(id: Id): Promise<WorkTaskRecord | undefined>
  listTasks(): Promise<readonly WorkTaskRecord[]>
  listTasksForProject(projectId: Id): Promise<readonly WorkTaskRecord[]>
  listChildren(parentTaskId: Id): Promise<readonly WorkTaskRecord[]>
  createTask(draft: TaskDraft): Promise<WorkTaskRecord>
  updateTask(id: Id, patch: Partial<TaskDraft>, expectedUpdatedAt: number): Promise<WorkTaskRecord | undefined>
  deleteTask(id: Id): Promise<boolean>
  loadDefaultWorkflow(type: WorkRecordType): Promise<Workflow>
}

export interface WorkDeps {
  readonly actor: Actor
  readonly can: Can
  readonly repo: WorkRepository
  readonly uow: UnitOfWork
  readonly clock: Clock
}

export type WorkResult<T> = Result<T>
