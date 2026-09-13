import { ok, type Id } from '@ops/kernel'
import type { NotificationStore, RecordRef } from '@ops/platform'
import type { CronJob, CronJobOutcome, CronWindow } from './cron-job'
import { localDateFormatter } from './local-date'

// Job name in logs and in the cron route's `ran` list, as named in spec §13.
const DUE_SOON_JOB_NAME = 'tasks.dueSoon'

/** Most items one run notifies about (spec §13). */
export const DUE_SOON_LIMIT = 200

/** How far ahead of the run an item counts as due soon. */
export const DUE_SOON_HORIZON_MS = 24 * 60 * 60 * 1000

/** An open item with a due time, as listed by a `DueItemSource`. */
export interface DueItem {
  readonly record: RecordRef
  readonly title: string
  readonly assigneeIds: readonly Id[]
  readonly dueAt: number
}

/** Read port for items with a due time. */
export interface DueItemSource {
  /** Lists open items with `fromMs <= dueAt < toMs`, earliest due first, at most `limit`. */
  listDueWithin(fromMs: number, toMs: number, limit: number): Promise<readonly DueItem[]>
}

/** Dependencies of the due-soon job. */
export interface DueSoonDeps {
  readonly source: DueItemSource
  readonly notifications: NotificationStore
  /** Tenant IANA time zone, for example `Europe/Berlin` (decision D-39). */
  readonly timeZone: string
}

// The key changes only when the item's local due date changes, so reruns and runs across UTC midnight stay deduplicated.
function dueSoonDedupeKey(input: { record: RecordRef; dueLocalDate: string; userId: Id }): string {
  return `${input.record.type}:${input.record.id}:due_soon:${input.dueLocalDate}:${input.userId}`
}

async function notifyAssignees(item: DueItem, dueLocalDate: string, store: NotificationStore): Promise<number> {
  let created = 0
  for (const userId of item.assigneeIds) {
    const outcome = await store.insertIfAbsent({
      userId,
      type: 'due_soon',
      dedupeKey: dueSoonDedupeKey({ record: item.record, dueLocalDate, userId }),
      record: item.record,
      data: { title: item.title, dueAt: item.dueAt },
    })
    if (outcome === 'created') created += 1
  }
  return created
}

async function runDueSoon(deps: DueSoonDeps, window: CronWindow): Promise<CronJobOutcome> {
  const toLocalDate = localDateFormatter(deps.timeZone)
  const listed = await deps.source.listDueWithin(window.end, window.end + DUE_SOON_HORIZON_MS, DUE_SOON_LIMIT)
  const items = listed.slice(0, DUE_SOON_LIMIT)
  let created = 0
  let attempted = 0
  for (const item of items) {
    created += await notifyAssignees(item, toLocalDate(item.dueAt), deps.notifications)
    attempted += item.assigneeIds.length
  }
  return { processed: items.length, created, skipped: attempted - created }
}

/**
 * Creates the job that notifies every assignee of open items due within 24 hours of the run, at most 200 items per run.
 * Repeated runs create nothing new: each dedupe key holds the record, `due_soon`, the due date in the tenant time zone
 * and the user. `skipped` counts assignees who already had the notification.
 * @returns the job; source or store exceptions surface as a failed run (`INTERNAL`) through `runCron`.
 */
export function createDueSoonJob(deps: DueSoonDeps): CronJob {
  return {
    name: DUE_SOON_JOB_NAME,
    run: async (window) => ok(await runDueSoon(deps, window)),
  }
}
