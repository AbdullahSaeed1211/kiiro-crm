import { asId, ok, type Id } from '@ops/kernel'
import { isManagerUp } from '@ops/platform'
import type { CallLogRecord, ScheduleItemRecord } from '../ports/records'
import type { CrmDeps } from '../ports/repository'
import { cleanNullable, createActivity, executeCommand, failure, parse, type CrmResult } from '../domain/helpers'
import { createScheduleItemSchema, updateScheduleItemSchema } from '../schema'
import {
  authorizedScheduleParent,
  resolveScheduleAssignees,
  syncLeadCallback,
  type ScheduleParent,
} from './schedule-support'

type RequestedSchedulePatch = ReturnType<typeof updateScheduleItemSchema.parse>['patch']
interface CleanSchedulePatch {
  readonly startsAt?: number
  readonly status?: ScheduleItemRecord['status']
  readonly title?: string | null
  readonly notes?: string | null
  readonly assigneeIds?: readonly Id[]
}

async function recordScheduleActivity(input: {
  readonly deps: CrmDeps
  readonly item: ScheduleItemRecord
  readonly field: 'created' | 'updated'
}) {
  const { deps, item, field } = input
  await createActivity({
    deps,
    record: { type: item.recordType, id: item.recordId },
    verb: field === 'created' ? 'record.created' : 'field.changed',
    data: {
      field: 'scheduleItem',
      scheduleItemId: item.id,
      kind: item.kind,
      startsAt: item.startsAt,
      status: item.status,
    },
  })
}

async function existingCallback(deps: CrmDeps, recordType: 'lead' | 'contact', recordId: Id) {
  const sourceKey = recordType === 'lead' ? `callback:${recordType}:${recordId}` : null
  const existing = await deps.repo.findScheduleItemForRecord({ kind: 'callback', recordType, recordId })
  return existing ?? (sourceKey === null ? undefined : deps.repo.findScheduleItemBySourceKey(sourceKey))
}

async function persistCreatedSchedule(input: {
  readonly deps: CrmDeps
  readonly value: ReturnType<typeof createScheduleItemSchema.parse>
  readonly recordId: Id
  readonly assigneeIds: readonly Id[]
}): Promise<CrmResult<ScheduleItemRecord>> {
  const { deps, value, recordId, assigneeIds } = input
  const sourceKey = value.kind === 'callback' ? `callback:${value.recordType}:${recordId}` : null
  const existing = value.kind === 'callback' ? await existingCallback(deps, value.recordType, recordId) : undefined
  if (existing !== undefined && (existing.recordType !== value.recordType || existing.recordId !== recordId))
    return failure('CONFLICT', 'This callback is linked to a different record.')
  const patch = {
    startsAt: value.startsAt,
    status: 'scheduled' as const,
    assigneeIds,
    title: cleanNullable(value.title),
    notes: cleanNullable(value.notes),
  }
  const saved =
    existing === undefined
      ? await deps.repo.createScheduleItem({
          kind: value.kind,
          recordType: value.recordType,
          recordId,
          ...patch,
          sourceKey,
        })
      : await deps.repo.updateScheduleItem(existing.id, patch, existing.updatedAt)
  if (saved === undefined) return failure('CONFLICT', 'This callback changed. Refresh and try again.')
  return ok(saved)
}

async function createScheduleItemWork(deps: CrmDeps, input: unknown): Promise<CrmResult<ScheduleItemRecord>> {
  const parsed = parse(createScheduleItemSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const recordId = asId(value.recordId)
  const parentResult = await authorizedScheduleParent(deps, value.recordType, recordId)
  if (parentResult.record === undefined) return parentResult.error
  const parent = parentResult.record as unknown as ScheduleParent
  const assigneeIds = await resolveScheduleAssignees({
    deps,
    parent,
    recordType: value.recordType,
    requested: value.assigneeIds,
  })
  if (assigneeIds === undefined) return failure('FORBIDDEN', 'Choose active staff you are allowed to assign.')
  return deps.uow.run(async () => {
    const existing = value.kind === 'callback' ? await existingCallback(deps, value.recordType, recordId) : undefined
    const result = await persistCreatedSchedule({ deps, value, recordId, assigneeIds })
    if (!result.ok) return result
    const saved = result.value
    await recordScheduleActivity({ deps, item: saved, field: existing === undefined ? 'created' : 'updated' })
    if (value.kind === 'callback' && value.recordType === 'lead') {
      const synchronized = await syncLeadCallback({
        deps,
        recordId,
        startsAt: value.startsAt,
        currentParent: parent,
        scheduleItem: saved,
      })
      if (!synchronized)
        return failure('CONFLICT', 'Schedule saved, but the lead follow-up date could not sync. Refresh and retry.')
    }
    return ok(saved)
  })
}

/** Creates a scoped appointment or a callback synchronized with a lead's legacy follow-up date. */
export function createScheduleItem(deps: CrmDeps, input: unknown): Promise<CrmResult<ScheduleItemRecord>> {
  return executeCommand(deps, input, createScheduleItemWork)
}

async function updateScheduleItemWork(deps: CrmDeps, input: unknown): Promise<CrmResult<ScheduleItemRecord>> {
  const parsed = parse(updateScheduleItemSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const item = await deps.repo.getScheduleItem(asId(value.id))
  if (item === undefined) return failure('NOT_FOUND', 'Schedule item not found')
  const parentResult = await authorizedScheduleParent(deps, item.recordType, item.recordId)
  if (parentResult.record === undefined) return failure('NOT_FOUND', 'Schedule item not found')
  const parent = parentResult.record as unknown as ScheduleParent
  const patch = await authorizedSchedulePatch({ deps, parent, recordType: item.recordType, patch: value.patch })
  if (!patch.ok) return patch
  return deps.uow.run(() =>
    saveScheduleUpdate({ deps, item, parent, expectedUpdatedAt: value.expectedUpdatedAt, patch: patch.value }),
  )
}

async function authorizedSchedulePatch(input: {
  readonly deps: CrmDeps
  readonly parent: ScheduleParent
  readonly recordType: 'lead' | 'contact'
  readonly patch: RequestedSchedulePatch
}): Promise<CrmResult<CleanSchedulePatch>> {
  const { deps, parent, recordType, patch } = input
  const { assigneeIds, ...rest } = patch
  const fields: CleanSchedulePatch = {
    ...(rest.startsAt === undefined ? {} : { startsAt: rest.startsAt }),
    ...(rest.status === undefined ? {} : { status: rest.status }),
    ...(rest.title === undefined ? {} : { title: rest.title }),
    ...(rest.notes === undefined ? {} : { notes: rest.notes }),
  }
  if (assigneeIds === undefined) return ok(fields)
  if (!isManagerUp(deps.actor)) return failure('FORBIDDEN', 'Only a manager can reassign an appointment.')
  const resolved = await resolveScheduleAssignees({ deps, parent, recordType, requested: assigneeIds })
  return resolved === undefined
    ? failure('FORBIDDEN', 'Choose active staff who can access this record.')
    : ok({ ...fields, assigneeIds: resolved })
}

async function saveScheduleUpdate(input: {
  readonly deps: CrmDeps
  readonly item: ScheduleItemRecord
  readonly parent: ScheduleParent
  readonly expectedUpdatedAt: number
  readonly patch: CleanSchedulePatch
}): Promise<CrmResult<ScheduleItemRecord>> {
  const { deps, item, parent, expectedUpdatedAt, patch } = input
  const saved = await deps.repo.updateScheduleItem(item.id, patch, expectedUpdatedAt)
  if (saved === undefined) return failure('CONFLICT', 'This schedule item changed. Refresh and try again.')
  await recordScheduleActivity({ deps, item: saved, field: 'updated' })
  return syncCallbackIfNeeded({ deps, previous: item, parent, saved })
}

async function syncCallbackIfNeeded(input: {
  readonly deps: CrmDeps
  readonly previous: ScheduleItemRecord
  readonly parent: ScheduleParent
  readonly saved: ScheduleItemRecord
}): Promise<CrmResult<ScheduleItemRecord>> {
  const { deps, previous, parent, saved } = input
  if (previous.kind !== 'callback' || previous.recordType !== 'lead') return ok(saved)
  const nextActionAt = saved.status === 'scheduled' ? saved.startsAt : null
  const synchronized = await syncLeadCallback({
    deps,
    recordId: previous.recordId,
    startsAt: nextActionAt,
    currentParent: parent,
    scheduleItem: saved,
  })
  return synchronized
    ? ok(saved)
    : failure('CONFLICT', 'Schedule saved, but the lead follow-up date could not sync. Refresh and retry.')
}

/** Updates one visible schedule item with compare-and-set; only managers may reassign its staff. */
export function updateScheduleItem(deps: CrmDeps, input: unknown): Promise<CrmResult<ScheduleItemRecord>> {
  return executeCommand(deps, input, updateScheduleItemWork)
}

/** Lists events only within an explicit bounded window; staff can only request their own assignments. */
export async function listScheduleItems(
  deps: CrmDeps,
  input: { readonly from: number; readonly to: number; readonly scope?: 'mine' | 'team'; readonly assigneeId?: string },
): Promise<CrmResult<readonly ScheduleItemRecord[]>> {
  if (!Number.isSafeInteger(input.from) || !Number.isSafeInteger(input.to) || input.from > input.to)
    return failure('VALIDATION', 'Choose a valid schedule range.')
  const filter = scheduleFilter(deps, input)
  return filter.ok ? ok(await deps.repo.listScheduleItems(filter.value)) : filter
}

function scheduleFilter(
  deps: CrmDeps,
  input: { readonly from: number; readonly to: number; readonly scope?: 'mine' | 'team'; readonly assigneeId?: string },
): CrmResult<Parameters<CrmDeps['repo']['listScheduleItems']>[0]> {
  if (input.to - input.from > 93 * 86_400_000) return failure('VALIDATION', 'Choose a range of 93 days or less.')
  const scope = input.scope ?? 'mine'
  if (scope === 'team' && !isManagerUp(deps.actor)) return failure('FORBIDDEN', 'Team schedule is for managers.')
  if (input.assigneeId !== undefined && !isManagerUp(deps.actor))
    return failure('FORBIDDEN', 'Only a manager can filter the team schedule by person.')
  const assigneeId = filterAssignee(deps, scope, input.assigneeId)
  return ok({ from: input.from, to: input.to, ...(assigneeId === undefined ? {} : { assigneeId }) })
}

function filterAssignee(deps: CrmDeps, scope: 'mine' | 'team', requested?: string): Id | undefined {
  if (scope === 'mine') return deps.actor.id
  return requested === undefined ? undefined : asId(requested)
}

/** Lists the current actor's recent calls, or all readable calls in the authorized manager team view. */
export async function listRecentCallLogs(
  deps: CrmDeps,
  input: Readonly<{ scope?: 'mine' | 'team' }> = {},
): Promise<CrmResult<readonly CallLogRecord[]>> {
  const scope = input.scope ?? 'mine'
  if (scope === 'team' && !isManagerUp(deps.actor)) return failure('FORBIDDEN', 'Team call history is for managers.')
  return ok(await deps.repo.listRecentCallLogs(scope === 'team' ? undefined : deps.actor.id, 20))
}
