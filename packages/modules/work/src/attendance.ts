import { domainError, err, invalidInput, ok, type Clock, type Result } from '@ops/kernel'
import { isManagerUp, type Actor } from '@ops/platform'
import { z } from 'zod'

/** Actual server receipts never come from the browser. All times are Unix UTC milliseconds. */
export interface AttendanceRecord {
  readonly id: string
  readonly userId: string
  readonly reportedCheckInAt: number
  readonly submittedAt: number
  readonly reportedCheckOutAt: number | null
  readonly checkOutSubmittedAt: number | null
  readonly note: string
  readonly checkOutNote: string
}

export interface AttendanceRepository {
  open(userId: string): Promise<AttendanceRecord | undefined>
  latest(userId: string): Promise<AttendanceRecord | undefined>
  get(id: string): Promise<AttendanceRecord | undefined>
  create(input: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord | undefined>
  close(input: {
    id: string
    userId: string
    reportedAt: number
    submittedAt: number
    note: string
  }): Promise<AttendanceRecord | undefined>
  list(userId?: string): Promise<readonly AttendanceRecord[]>
}
export interface AttendanceDeps {
  readonly actor: Actor
  readonly clock: Clock
  readonly repo: AttendanceRepository
}
export const attendancePunchSchema = z.strictObject({
  reportedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  note: z.string().trim().max(500).default(''),
})
export const attendanceCheckoutSchema = attendancePunchSchema.extend({ sessionId: z.string().min(1).max(64) })
const fail = (code: 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND', message: string) =>
  err(domainError(code, message))
const DAY = 86_400_000
const closedResult = (record: AttendanceRecord | undefined): Result<AttendanceRecord> =>
  record === undefined ? fail('CONFLICT', 'Attendance changed. Refresh and try again.') : ok(record)

function timeError(reportedAt: number, submittedAt: number, note: string): string | undefined {
  if (reportedAt > submittedAt) return 'Reported time cannot be in the future.'
  if (reportedAt < submittedAt - 30 * DAY) return 'Reported time must be within the last 30 days.'
  if (submittedAt - reportedAt > 60_000 && note === '') return 'Add a note explaining the earlier reported time.'
  return undefined
}

function punchTime(deps: AttendanceDeps, data: z.infer<typeof attendancePunchSchema>) {
  const submittedAt = deps.clock.now()
  const reportedAt = data.reportedAt ?? submittedAt
  const error = timeError(reportedAt, submittedAt, data.note)
  return error === undefined ? ok({ submittedAt, reportedAt, note: data.note }) : fail('VALIDATION', error)
}

async function overlapsPrevious(deps: AttendanceDeps, reportedAt: number): Promise<boolean> {
  const previousEnd = (await deps.repo.latest(deps.actor.id))?.reportedCheckOutAt
  return typeof previousEnd === 'number' && reportedAt < previousEnd
}

/** Self-service only: identity and receipt time are always derived from the authenticated request. */
export async function checkIn(deps: AttendanceDeps, input: unknown): Promise<Result<AttendanceRecord>> {
  if (!deps.actor.active) return fail('FORBIDDEN', 'An active account is required.')
  const parsed = attendancePunchSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('Check-in details are invalid.', parsed.error.issues))
  const times = punchTime(deps, parsed.data)
  if (!times.ok) return times
  const { submittedAt, reportedAt } = times.value
  if (await deps.repo.open(deps.actor.id)) return fail('CONFLICT', 'You are already checked in. Check out first.')
  if (await overlapsPrevious(deps, reportedAt))
    return fail('VALIDATION', 'Check-in cannot overlap your previous attendance session.')
  const record = await deps.repo.create({
    userId: deps.actor.id,
    reportedCheckInAt: reportedAt,
    submittedAt,
    reportedCheckOutAt: null,
    checkOutSubmittedAt: null,
    note: parsed.data.note,
    checkOutNote: '',
  })
  return record === undefined ? fail('CONFLICT', 'You are already checked in. Refresh attendance.') : ok(record)
}

/** Closes exactly one own session atomically; retries cannot overwrite an earlier receipt. */
export async function checkOut(deps: AttendanceDeps, input: unknown): Promise<Result<AttendanceRecord>> {
  if (!deps.actor.active) return fail('FORBIDDEN', 'An active account is required.')
  const parsed = attendanceCheckoutSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('Check-out details are invalid.', parsed.error.issues))
  const record = await deps.repo.get(parsed.data.sessionId)
  if (record?.userId !== deps.actor.id) return fail('NOT_FOUND', 'Attendance session not found.')
  if (record.checkOutSubmittedAt !== null) return ok(record)
  const times = punchTime(deps, parsed.data)
  if (!times.ok) return times
  const { submittedAt, reportedAt } = times.value
  if (reportedAt < record.reportedCheckInAt) return fail('VALIDATION', 'Check-out cannot be before check-in.')
  const saved = await deps.repo.close({
    id: record.id,
    userId: deps.actor.id,
    reportedAt,
    submittedAt,
    note: parsed.data.note,
  })
  return closedResult(saved)
}

/** Staff see only their own attendance; managers and owners may explicitly request the team view. */
export async function listAttendance(
  deps: AttendanceDeps,
  team: boolean,
): Promise<Result<readonly AttendanceRecord[]>> {
  if (!deps.actor.active || (team && !isManagerUp(deps.actor)))
    return fail('FORBIDDEN', 'Team attendance is for admins only.')
  return ok(await deps.repo.list(team ? undefined : deps.actor.id))
}
