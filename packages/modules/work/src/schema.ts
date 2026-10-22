import { z } from 'zod'
import { TASK_REPEATS } from './domain/recurrence'

/** Epoch milliseconds (zod rejects NaN and infinities), or `null` to clear the date. */
const date = z.number().nullable()
const nonEmptyId = z.string().min(1)
/** An optional reference; absent and `null` both mean "none". */
const optionalRef = nonEmptyId.nullable().optional()
const description = z.string().max(20_000, 'Use 20,000 characters or fewer.').nullable()
const title = z.string().trim().min(1, 'Enter a title.').max(300, 'Use 300 characters or fewer.')
const projectName = z.string().trim().min(1, 'Enter a project name.').max(200, 'Use 200 characters or fewer.')
const priority = z.enum(['none', 'low', 'medium', 'high', 'urgent'])
const version = z.number()
const repeat = z.enum(TASK_REPEATS)
const agencyTitle = z.string().trim().min(1, 'Enter a title.').max(300, 'Use 300 characters or fewer.')
const optionalNote = z.string().trim().max(5_000).nullable().optional()
const webUrl = z
  .url()
  .max(2_000)
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), { message: 'Use a secure web link.' })
  .nullable()
  .optional()

export const createDeliverableSchema = z.strictObject({
  projectId: nonEmptyId,
  title: agencyTitle,
  ownerId: nonEmptyId.optional(),
  linkUrl: webUrl,
  attachmentId: optionalRef,
})

export const respondToDeliverableSchema = z.strictObject({
  deliverableId: nonEmptyId,
  expectedUpdatedAt: version,
  status: z.enum(['sent_to_client', 'approved', 'changes_requested']),
  responseNote: optionalNote,
})

export const createContentItemSchema = z
  .strictObject({
    projectId: nonEmptyId,
    title: agencyTitle,
    body: z.string().trim().max(20_000).nullable().optional(),
    channel: z.string().trim().max(100).optional(),
    publishAt: z.number().nonnegative().nullable().optional(),
    status: z.enum(['draft', 'scheduled', 'published']).optional(),
    ownerId: nonEmptyId.optional(),
  })
  .refine(
    (value) =>
      value.status === undefined ||
      value.status === 'draft' ||
      (value.publishAt !== null && value.publishAt !== undefined && !!value.channel?.trim()),
    {
      message: 'Scheduled or published content needs a date and channel.',
      path: ['publishAt'],
    },
  )

export const updateContentItemSchema = z.strictObject({
  contentItemId: nonEmptyId,
  expectedUpdatedAt: version,
  patch: z
    .strictObject({
      title: agencyTitle.optional(),
      body: z.string().trim().max(20_000).nullable().optional(),
      channel: z.string().trim().max(100).nullable().optional(),
      publishAt: z.number().nonnegative().nullable().optional(),
      status: z.enum(['draft', 'scheduled', 'published']).optional(),
      ownerId: nonEmptyId.optional(),
    })
    .refine((patch) => Object.keys(patch).length > 0, { message: 'Change at least one field.' }),
})

const startNotAfterDue = (value: { startAt?: number | null | undefined; dueAt?: number | null | undefined }): boolean =>
  typeof value.startAt !== 'number' || typeof value.dueAt !== 'number' || value.startAt <= value.dueAt
const startNotAfterTarget = (value: {
  startAt?: number | null | undefined
  targetEndAt?: number | null | undefined
}): boolean =>
  typeof value.startAt !== 'number' || typeof value.targetEndAt !== 'number' || value.startAt <= value.targetEndAt

/** Input of `createTask`. Absent optional fields default to `null`, no assignee, and priority `none`. */
export const createTaskSchema = z
  .strictObject({
    title,
    description: description.optional(),
    projectId: optionalRef,
    parentTaskId: optionalRef,
    assigneeIds: z.array(nonEmptyId).optional(),
    groupId: optionalRef,
    priority: priority.optional(),
    repeat: repeat.optional(),
    relatedType: z.string().nullable().optional(),
    relatedId: optionalRef,
    startAt: date.optional(),
    dueAt: date.optional(),
    ownerOnly: z.boolean().optional(),
  })
  .refine(startNotAfterDue, { message: 'The start date must not be after the due date.', path: ['startAt'] })

/** Editable task fields; stage, dates and completion have their own commands. */
export const taskPatchSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    priority: priority.optional(),
    repeat: repeat.optional(),
    assigneeIds: z.array(nonEmptyId).optional(),
    groupId: nonEmptyId.nullable().optional(),
    relatedType: z.string().nullable().optional(),
    relatedId: nonEmptyId.nullable().optional(),
    ownerOnly: z.boolean().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Change at least one field.' })

/** Input of `updateTask`: the patch applies only while the task still has `expectedUpdatedAt`. */
export const updateTaskSchema = z.object({ taskId: nonEmptyId, expectedUpdatedAt: version, patch: taskPatchSchema })

/** Input of `moveTask`; the optional neighbours place the task between two cards of the destination stage. */
export const moveTaskSchema = z.object({
  taskId: nonEmptyId,
  toStageId: nonEmptyId,
  expectedUpdatedAt: version,
  beforeTaskId: nonEmptyId.optional(),
  afterTaskId: nonEmptyId.optional(),
})

/** Input of `createProject`. The owner defaults to the acting user. */
export const createProjectSchema = z
  .strictObject({
    name: projectName,
    organizationId: nonEmptyId.nullable().optional(),
    ownerId: nonEmptyId.nullable().optional(),
    memberIds: z.array(nonEmptyId).optional(),
    startAt: date.optional(),
    targetEndAt: date.optional(),
    description: description.optional(),
  })
  .refine(startNotAfterTarget, { message: 'The start date must not be after the target end date.', path: ['startAt'] })

/** Editable project fields; stage, owner and membership have their own commands. */
export const projectPatchSchema = z.strictObject({
  name: projectName.optional(),
  organizationId: nonEmptyId.nullable().optional(),
  startAt: date.optional(),
  targetEndAt: date.optional(),
  description: z.string().nullable().optional(),
})

/** Input of `updateProject`: the patch applies only while the project still has `expectedUpdatedAt`. */
export const updateProjectSchema = z.object({
  projectId: nonEmptyId,
  expectedUpdatedAt: version,
  patch: projectPatchSchema,
})

export const setProjectRetainerSchema = z.strictObject({
  projectId: nonEmptyId,
  retainer: z.boolean(),
  expectedUpdatedAt: version,
})

/** Monthly design work orders are opt-in and use calendar days, independent of the tenant timezone. */
export const configureProjectMonthlyDesignSchema = z.strictObject({
  projectId: nonEmptyId,
  expectedUpdatedAt: version,
  enabled: z.boolean(),
  title: z.string().trim().min(1, 'Enter a work order title.').max(200, 'Use 200 characters or fewer.'),
  assigneeIds: z.array(nonEmptyId),
  issueDay: z.number().int().min(1).max(31).default(23),
  dueDay: z.number().int().min(1).max(31).default(3),
})

/** Persisted shape validated whenever monthly design settings are read from project custom data. */
export const monthlyDesignConfigSchema = z.strictObject({
  enabled: z.boolean(),
  title: z.string().trim().min(1).max(200),
  assigneeIds: z.array(nonEmptyId),
  issueDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  effectiveFrom: z.number().nonnegative(),
})

/** Compare-and-set guard for commands that only need the record's current version. */
export const expectedVersionSchema = z.object({ expectedUpdatedAt: version })

/** Input of `setTaskDates`; both dates are replaced, `null` clears one. */
export const taskDatesSchema = z
  .object({ startAt: date, dueAt: date, expectedUpdatedAt: version })
  .refine(startNotAfterDue, { message: 'The start date must not be after the due date.', path: ['startAt'] })

/** Input of `addProjectMember`. */
export const projectMemberSchema = z.object({ memberId: nonEmptyId, expectedUpdatedAt: version })

export type TaskPatchInput = z.infer<typeof taskPatchSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type ProjectPatchInput = z.infer<typeof projectPatchSchema>
