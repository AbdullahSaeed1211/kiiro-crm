import type { Clock, Id, Result } from '@ops/kernel'
import type { Actor, Can, StageCategory, StageStore, StageTransition, UnitOfWork, Workflow } from '@ops/platform'
import type { TaskRepeat } from '../domain/recurrence'
import type { TaskPriority, TaskRecord as TaskPortRecord } from './tasks'

export type WorkRecordType = 'project' | 'task'
export interface MonthlyDesignConfig {
  readonly enabled: boolean
  readonly title: string
  readonly assigneeIds: readonly Id[]
  readonly issueDay: number
  readonly dueDay: number
  readonly effectiveFrom: number
}
export interface ProjectRecord {
  readonly id: Id
  readonly name: string
  readonly organizationId: Id | null
  readonly ownerId: Id | null
  readonly memberIds: readonly Id[]
  readonly workflowId: Id
  readonly stageId: Id
  readonly stageCategory: StageCategory
  readonly stageEnteredAt: number
  readonly startAt: number | null
  readonly targetEndAt: number | null
  readonly description: string | null
  readonly monthlyDesign: MonthlyDesignConfig | null
  readonly createdAt: number
  readonly updatedAt: number
}

export interface WorkTaskRecord extends TaskPortRecord {
  readonly description: string | null
  readonly parentTaskId: Id | null
  readonly rank: string
  readonly groupId: Id | null
  readonly completedAt: number | null
  readonly createdAt: number
  readonly stageCategory: StageCategory
  /** Hidden from staff; only owners and managers may set it. */
  readonly ownerOnly: boolean
  /** Completing a task with a due date and a repeat creates the next one. */
  readonly repeat: TaskRepeat
}

export type DeliverableStatus = 'draft' | 'sent_to_client' | 'approved' | 'changes_requested'
export interface DeliverableRecord {
  readonly id: Id
  readonly projectId: Id
  readonly title: string
  readonly ownerId: Id
  readonly status: DeliverableStatus
  readonly linkUrl: string | null
  readonly attachmentId: Id | null
  readonly sentAt: number | null
  readonly respondedAt: number | null
  readonly respondedBy: Id | null
  readonly responseNote: string | null
  readonly createdAt: number
  readonly updatedAt: number
}

export type ContentStatus = 'draft' | 'scheduled' | 'published'
export interface ContentItemRecord {
  readonly id: Id
  readonly projectId: Id
  readonly title: string
  readonly body: string | null
  readonly channel: string | null
  readonly publishAt: number | null
  readonly status: ContentStatus
  readonly ownerId: Id
  readonly createdAt: number
  readonly updatedAt: number
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
  readonly repeat?: TaskRepeat
  readonly ownerOnly?: boolean
  readonly monthlyOrigin?: { readonly projectId: Id; readonly issueMonth: string }
  readonly monthlyOccurrenceKey?: string
}

export interface ProjectPatch {
  readonly name?: string
  readonly organizationId?: Id | null
  readonly startAt?: number | null
  readonly targetEndAt?: number | null
  readonly description?: string | null
  /** Internal membership CAS patch; public commands use add/removeProjectMember. */
  readonly memberIds?: readonly Id[]
}

export interface TaskPatch {
  readonly title?: string
  readonly description?: string | null
  readonly priority?: TaskPriority
  readonly assigneeIds?: readonly Id[]
  readonly groupId?: Id | null
  readonly relatedType?: string | null
  readonly relatedId?: Id | null
  readonly repeat?: TaskRepeat
  readonly ownerOnly?: boolean
}

export interface TaskDatePatch {
  readonly startAt: number | null
  readonly dueAt: number | null
}

export interface TaskMoveWrite {
  readonly taskId: Id
  readonly toStageId: Id
  readonly stageEnteredAt: number
  readonly rank: string
  readonly completedAt: number | null
  readonly expectedUpdatedAt: number
  readonly transition: StageTransition
}

/** A task or project that was archived, as the archive screen lists it. */
export interface ArchivedWork {
  readonly type: WorkRecordType
  readonly id: Id
  readonly label: string
  readonly archivedAt: number
  readonly updatedAt: number
}

export interface WorkRepository extends StageStore {
  createDeliverable(input: Omit<DeliverableRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeliverableRecord>
  getDeliverable(id: Id): Promise<DeliverableRecord | undefined>
  listDeliverables(projectId: Id): Promise<readonly DeliverableRecord[]>
  updateDeliverable(
    id: Id,
    patch: Partial<Omit<DeliverableRecord, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>,
    expectedUpdatedAt: number,
  ): Promise<DeliverableRecord | undefined>
  createContentItem(input: Omit<ContentItemRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContentItemRecord>
  getContentItem(id: Id): Promise<ContentItemRecord | undefined>
  listContentItems(input: {
    readonly from: number
    readonly to: number
    readonly projectId?: Id
  }): Promise<readonly ContentItemRecord[]>
  updateContentItem(
    id: Id,
    patch: Partial<Omit<ContentItemRecord, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>,
    expectedUpdatedAt: number,
  ): Promise<ContentItemRecord | undefined>
  getProject(id: Id): Promise<ProjectRecord | undefined>
  listProjects(): Promise<readonly ProjectRecord[]>
  /** One page of projects by name, with the total number of projects. */
  listProjectsPage(
    page: number,
    limit: number,
  ): Promise<{ readonly records: readonly ProjectRecord[]; readonly total: number }>
  createProject(draft: ProjectDraft): Promise<Result<ProjectRecord>>
  updateProject(id: Id, patch: ProjectPatch, expectedUpdatedAt: number): Promise<ProjectRecord | undefined>
  updateProjectRetainer(
    id: Id,
    retainer: boolean,
    expectedUpdatedAt: number,
  ): Promise<{ readonly retainer: boolean; readonly updatedAt: number } | undefined>
  updateProjectMonthlyDesign(
    id: Id,
    config: MonthlyDesignConfig,
    expectedUpdatedAt: number,
  ): Promise<{ readonly config: MonthlyDesignConfig; readonly updatedAt: number } | undefined>
  getTask(id: Id): Promise<WorkTaskRecord | undefined>
  listTasks(): Promise<readonly WorkTaskRecord[]>
  listTasksForProject(projectId: Id): Promise<readonly WorkTaskRecord[]>
  listChildren(parentTaskId: Id): Promise<readonly WorkTaskRecord[]>
  createTask(draft: TaskDraft): Promise<Result<WorkTaskRecord>>
  updateTask(id: Id, patch: TaskPatch | TaskDatePatch, expectedUpdatedAt: number): Promise<WorkTaskRecord | undefined>
  saveTaskMove(input: TaskMoveWrite): Promise<WorkTaskRecord | undefined>
  deleteTask(id: Id): Promise<boolean>
  /** Hides the task or project from every list and search while it still has `expectedUpdatedAt`; false when it changed meanwhile. */
  archive(type: WorkRecordType, id: Id, expectedUpdatedAt: number): Promise<boolean>
  /** Brings an archived task or project back while it still has `expectedUpdatedAt`; false when it changed meanwhile. */
  restore(type: WorkRecordType, id: Id, expectedUpdatedAt: number): Promise<boolean>
  /** Archived tasks or projects, newest first; owners and managers only see any. */
  listArchived(type: WorkRecordType): Promise<readonly ArchivedWork[]>
  loadDefaultWorkflow(type: WorkRecordType): Promise<Result<Workflow>>
}

export interface WorkDeps {
  readonly actor: Actor
  readonly can: Can
  readonly repo: WorkRepository
  readonly uow: UnitOfWork
  readonly clock: Clock
  readonly readRecord?: (type: string, id: Id) => Promise<boolean>
  /** Confirms an attachment is readable and belongs to this exact project. */
  readonly readProjectAttachment?: (projectId: Id, attachmentId: Id) => Promise<boolean>
  /** Confirms an assigned project member is an active staff account. */
  readonly isActiveUser?: (userId: Id) => Promise<boolean>
  /** Confirms an active project owner/member's work profile can read project tasks. */
  readonly canReadProjectAsUser?: (
    userId: Id,
    project: Pick<ProjectRecord, 'ownerId' | 'memberIds'>,
  ) => Promise<boolean>
}

export type WorkResult<T> = Result<T>
