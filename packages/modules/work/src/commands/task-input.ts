import { asId, type Id } from '@ops/kernel'
import type { TaskDraft, TaskPatch } from '../ports/work'
import { objectInput, validDate } from './input'

/**
 * Internal type for create input after parsing; removes optionals and makes
 * all field values explicit (e.g., description is string | null, not string | null | undefined).
 */
export type ParsedTaskDraft = TaskDraft & {
  readonly description: string | null
  readonly projectId: Id | null
  readonly parentTaskId: Id | null
  readonly assigneeIds: readonly Id[]
  readonly groupId: Id | null
  readonly relatedType: string | null
  readonly relatedId: Id | null
  readonly startAt: number | null
  readonly dueAt: number | null
}

function parseDate(value: Record<string, unknown>, key: string): number | null | undefined {
  if (value[key] === undefined) return null
  if (!validDate(value[key])) return undefined
  return value[key]
}

function parseId(value: unknown): Id | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return asId(value)
  return undefined
}

function validTitle(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.trim().length <= 300
}

function validPriority(value: unknown): value is NonNullable<TaskDraft['priority']> {
  return typeof value === 'string' && ['none', 'low', 'medium', 'high', 'urgent'].includes(value)
}

function validDescription(value: unknown): value is string | null {
  if (value === null) return true
  return typeof value === 'string' && value.length <= 20_000
}

interface ParsedIds {
  readonly projectId: Id | null | undefined
  readonly parentTaskId: Id | null | undefined
  readonly groupId: Id | null | undefined
  readonly relatedId: Id | null | undefined
}

function validateCreateIds(ids: ParsedIds): boolean {
  return (
    ids.projectId !== undefined &&
    ids.parentTaskId !== undefined &&
    ids.groupId !== undefined &&
    ids.relatedId !== undefined
  )
}

function validateCreateAssignees(value: Record<string, unknown>): string[] | undefined {
  const assignees = value['assigneeIds'] === undefined ? [] : value['assigneeIds']
  if (!Array.isArray(assignees) || !assignees.every((id) => typeof id === 'string')) return undefined
  return assignees
}

function validateCreatePriority(value: Record<string, unknown>): NonNullable<TaskDraft['priority']> | undefined {
  const priority = value['priority'] === undefined ? 'none' : value['priority']
  return validPriority(priority) ? priority : undefined
}

function validateCreateDates(
  value: Record<string, unknown>,
): { startAt: number | null; dueAt: number | null } | undefined {
  const startAt = parseDate(value, 'startAt')
  const dueAt = parseDate(value, 'dueAt')
  if (startAt === undefined || dueAt === undefined) return undefined
  if (typeof startAt === 'number' && typeof dueAt === 'number' && startAt > dueAt) return undefined
  return { startAt, dueAt }
}

function checkCreateMeta(value: Record<string, unknown>):
  | {
      description: string | null
      relatedType: string | null
    }
  | undefined {
  const description = value['description'] === undefined ? null : value['description']
  if (!validDescription(description)) return undefined
  const relatedType = value['relatedType'] === undefined ? null : value['relatedType']
  if (relatedType !== null && typeof relatedType !== 'string') return undefined
  return { description, relatedType }
}

function validateCreateFields(value: Record<string, unknown>): boolean {
  const fields = new Set([
    'title',
    'description',
    'projectId',
    'parentTaskId',
    'assigneeIds',
    'groupId',
    'priority',
    'relatedType',
    'relatedId',
    'startAt',
    'dueAt',
  ])
  return !Object.keys(value).some((key) => !fields.has(key))
}

function collectCreateData(value: Record<string, unknown>):
  | {
      ids: ParsedIds
      assignees: string[]
      priority: NonNullable<TaskDraft['priority']>
      dates: { startAt: number | null; dueAt: number | null }
      meta: { description: string | null; relatedType: string | null }
    }
  | undefined {
  const ids: ParsedIds = {
    projectId: parseId(value['projectId']),
    parentTaskId: parseId(value['parentTaskId']),
    groupId: parseId(value['groupId']),
    relatedId: parseId(value['relatedId']),
  }
  if (!validateCreateIds(ids)) return undefined

  const assignees = validateCreateAssignees(value)
  if (assignees === undefined) return undefined

  const priority = validateCreatePriority(value)
  if (priority === undefined) return undefined

  const dates = validateCreateDates(value)
  if (dates === undefined) return undefined

  const meta = checkCreateMeta(value)
  if (meta === undefined) return undefined

  return { ids, assignees, priority, dates, meta }
}

/** Parses untrusted task-create input; `undefined` means some field is missing, unknown or invalid. */
export function parseCreate(input: unknown): ParsedTaskDraft | undefined {
  const value = objectInput(input)
  if (value === undefined || !validTitle(value['title']) || !validateCreateFields(value)) return undefined

  const data = collectCreateData(value)
  if (data === undefined) return undefined

  // Type assertion is safe here because validateCreateIds ensures none are undefined
  return {
    title: value['title'].trim(),
    description: data.meta.description,
    projectId: data.ids.projectId as Id | null,
    parentTaskId: data.ids.parentTaskId as Id | null,
    assigneeIds: data.assignees.map(asId),
    groupId: data.ids.groupId as Id | null,
    priority: data.priority,
    relatedType: data.meta.relatedType,
    relatedId: data.ids.relatedId as Id | null,
    startAt: data.dates.startAt,
    dueAt: data.dates.dueAt,
  }
}

function validatePatchFields(value: Record<string, unknown>): boolean {
  const fields = new Set(['title', 'description', 'priority', 'assigneeIds', 'groupId', 'relatedType', 'relatedId'])
  return !Object.keys(value).some((key) => !fields.has(key))
}

function checkPatchString(value: Record<string, unknown>, key: string, validator: (v: unknown) => boolean): boolean {
  return !(key in value) || validator(value[key])
}

function checkPatchAssignees(value: Record<string, unknown>): boolean {
  if (!('assigneeIds' in value)) return true
  const ids = value['assigneeIds']
  return Array.isArray(ids) && ids.every((id) => typeof id === 'string')
}

function checkPatchIdFields(value: Record<string, unknown>): boolean {
  if ('groupId' in value && parseId(value['groupId']) === undefined) return false
  if ('relatedId' in value && parseId(value['relatedId']) === undefined) return false
  return true
}

function checkPatchFieldValues(value: Record<string, unknown>): boolean {
  return (
    checkPatchString(value, 'title', validTitle) &&
    checkPatchString(value, 'description', validDescription) &&
    checkPatchString(value, 'priority', validPriority) &&
    checkPatchAssignees(value) &&
    checkPatchIdFields(value) &&
    checkPatchString(value, 'relatedType', (v) => v === null || typeof v === 'string')
  )
}

function buildPatchResult(value: Record<string, unknown>): TaskPatch {
  const assigneeIds = value['assigneeIds'] as string[]
  return {
    ...('title' in value ? { title: (value['title'] as string).trim() } : {}),
    ...('description' in value ? { description: value['description'] as string | null } : {}),
    ...('priority' in value ? { priority: value['priority'] as NonNullable<TaskDraft['priority']> } : {}),
    ...('assigneeIds' in value ? { assigneeIds: assigneeIds.map(asId) } : {}),
    ...('groupId' in value ? { groupId: parseId(value['groupId']) as Id | null } : {}),
    ...('relatedType' in value ? { relatedType: value['relatedType'] as string | null } : {}),
    ...('relatedId' in value ? { relatedId: parseId(value['relatedId']) as Id | null } : {}),
  }
}

/** Parses an untrusted editable-field patch; `undefined` means a key is unknown or a value is invalid. */
export function parsePatch(input: unknown): TaskPatch | undefined {
  const value = objectInput(input)
  if (value === undefined || !validatePatchFields(value) || !checkPatchFieldValues(value)) return undefined
  return buildPatchResult(value)
}
