import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { systemClock, type Clock, type Logger } from '@ops/kernel'
import type { NotificationStore } from '@ops/platform'
import { ValidationError, type CollectionSlug, type Payload, type Where } from 'payload'
import { expect } from 'vitest'
import { COLLECTIONS, FIELDS, SETTINGS_GLOBAL } from '../../src/contracts/names'
import { createDueItemSource, createEmailMessageSink, createNotificationStore } from '../../src/repositories'
import { fieldOf, textOf } from '../../src/repositories/documents'
import type { LocalStack, SpikeCase } from './local-stack'

type LogFields = NonNullable<Parameters<Logger['info']>[1]>

interface CronJob {
  readonly name: string
}

interface CloudflareCron {
  createDueSoonJob(deps: {
    source: ReturnType<typeof createDueItemSource>
    notifications: NotificationStore
    timeZone: string
  }): CronJob
  runCron(run: { scheduledTime: number; jobs: readonly CronJob[]; clock: Clock; logger: Logger }): Promise<CronResult>
}

interface CronResult {
  readonly ran: readonly string[]
}

interface CronHarness {
  readonly run: () => Promise<CronResult>
  readonly entries: readonly LogFields[]
}

// Adapters may not import each other, so the Cloudflare adapter is loaded at run time and composed as the cron route does.
const CLOUDFLARE_ADAPTER = pathToFileURL(resolve(import.meta.dirname, '../../../cloudflare/src/index.ts')).href
const HOUR_MS = 3_600_000
const DUE_SOON_RAN = { ran: ['tasks.dueSoon'] }
const ENVELOPE = { envelopeFrom: 'sender@example.test', envelopeTo: 'inbox@in.localhost' }
const FIRST_DUE_TASK = 'Check appointment and contact paths'
const SECOND_DUE_TASK = 'Review accounting service pages'

async function scheduleExistingTask(payload: Payload, title: string, dueAt: number): Promise<void> {
  const { docs } = await payload.find({
    collection: COLLECTIONS.tasks,
    where: { title: { equals: title } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const [task] = docs
  if (task === undefined) throw new Error(`no task ${title}`)
  await payload.update({ collection: COLLECTIONS.tasks, id: task.id, data: { dueAt }, depth: 0, overrideAccess: true })
}

async function dueSoonCron(stack: LocalStack, hoursAfterSeed: number): Promise<CronHarness> {
  const { payload } = stack
  const cron = (await import(CLOUDFLARE_ADAPTER)) as CloudflareCron
  const settings = await payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true })
  const source = createDueItemSource(payload)
  const job = cron.createDueSoonJob({
    source,
    notifications: createNotificationStore(payload),
    timeZone: textOf(settings, 'timezone') ?? 'UTC',
  })
  const entries: LogFields[] = []
  const record = (_message: string, fields?: LogFields): void => {
    if (fields !== undefined) entries.push(fields)
  }
  const logger: Logger = { debug: record, info: record, warn: record, error: record }
  const scheduledTime = stack.now + hoursAfterSeed * HOUR_MS
  return { entries, run: () => cron.runCron({ scheduledTime, jobs: [job], clock: systemClock, logger }) }
}

async function countRows(payload: Payload, collection: CollectionSlug, where: Where = {}): Promise<number> {
  return (await payload.count({ collection, where, overrideAccess: true })).totalDocs
}

// The window from 12 to 36 hours after the seed holds one open task, due in a day and assigned to staff 2.
async function expectRerunCreatesNothing(stack: LocalStack): Promise<void> {
  await scheduleExistingTask(stack.payload, FIRST_DUE_TASK, stack.now + 24 * HOUR_MS)
  const cron = await dueSoonCron(stack, 12)
  const before = await countRows(stack.payload, COLLECTIONS.notifications)
  expect(await cron.run()).toEqual(DUE_SOON_RAN)
  expect(await countRows(stack.payload, COLLECTIONS.notifications)).toBe(before + 1)
  expect(await cron.run()).toEqual(DUE_SOON_RAN)
  expect(await countRows(stack.payload, COLLECTIONS.notifications)).toBe(before + 1)
  expect(cron.entries).toMatchObject([
    { job: 'tasks.dueSoon', processed: 1, created: 1, skipped: 0 },
    { job: 'tasks.dueSoon', processed: 1, created: 0, skipped: 1 },
  ])
}

// The window from 36 to 60 hours after the seed holds one open task, due in two days and assigned to staff 1.
async function expectConcurrentRunsCreateOnce(stack: LocalStack): Promise<void> {
  await scheduleExistingTask(stack.payload, SECOND_DUE_TASK, stack.now + 48 * HOUR_MS)
  const cron = await dueSoonCron(stack, 36)
  const before = await countRows(stack.payload, COLLECTIONS.notifications)
  expect(await Promise.all([cron.run(), cron.run()])).toEqual([DUE_SOON_RAN, DUE_SOON_RAN])
  expect(await countRows(stack.payload, COLLECTIONS.notifications)).toBe(before + 1)
}

function causeMessages(error: unknown): string[] {
  const messages: string[] = []
  for (let current: unknown = error; current instanceof Error; current = current.cause) messages.push(current.message)
  return messages
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  return undefined
}

// The adapter's duplicate check must recognize this shape: D1 reports the violation in the error causes.
async function expectDatabaseUniqueError(payload: Payload): Promise<void> {
  const { docs } = await payload.find({
    collection: COLLECTIONS.notifications,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const [existing] = docs
  if (existing === undefined) throw new Error('no notification to duplicate')
  const data = { user: fieldOf(existing, FIELDS.user), type: 'due_soon', dedupeKey: textOf(existing, 'dedupeKey') }
  const error = await rejectionOf(payload.create({ collection: COLLECTIONS.notifications, data, overrideAccess: true }))
  expect(error).toBeInstanceOf(Error)
  expect(error).not.toBeInstanceOf(ValidationError)
  expect(causeMessages(error).join('\n')).toMatch(/UNIQUE constraint failed: notifications\.dedupe_key/)
}

const rawMessage = (headers: string): ArrayBuffer =>
  new TextEncoder().encode(`${headers}\r\n\r\nSpike message body`).buffer

async function expectAcceptedTwiceStoredOnce(payload: Payload, headers: string, where: Where): Promise<void> {
  const sink = createEmailMessageSink(payload)
  const email = { ...ENVELOPE, raw: rawMessage(headers) }
  expect(await sink.accept(email)).toMatchObject({ ok: true })
  expect(await sink.accept(email)).toMatchObject({ ok: true })
  expect(await countRows(payload, COLLECTIONS.emailMessages, where)).toBe(1)
}

async function expectConcurrentAcceptStoredOnce(payload: Payload): Promise<void> {
  const sink = createEmailMessageSink(payload)
  const email = { ...ENVELOPE, raw: rawMessage('Message-ID: <spike-concurrent@example.test>') }
  expect(await Promise.all([sink.accept(email), sink.accept(email)])).toMatchObject([{ ok: true }, { ok: true }])
  const where = { messageId: { equals: '<spike-concurrent@example.test>' } }
  expect(await countRows(payload, COLLECTIONS.emailMessages, where)).toBe(1)
}

/** Idempotency of the due-soon job and the inbound email sink on local D1 (spec §13, §22 T-JOBS-1, T-MAIL-7). */
export const CRON_CASES: readonly SpikeCase[] = [
  ['runCron with tasks.dueSoon twice for one window creates the notification once', expectRerunCreatesNothing],
  ['two concurrent runs for one window create the notification once', expectConcurrentRunsCreateOnce],
  [
    'a duplicate dedupeKey fails in D1 with a UNIQUE error, not a ValidationError',
    (s) => expectDatabaseUniqueError(s.payload),
  ],
]

/** Inbound email stored once per Message-ID (spec §22 T-MAIL-7). */
export const INBOUND_CASES: readonly SpikeCase[] = [
  [
    'the same raw message accepted twice stores one emailMessages row',
    (s) =>
      expectAcceptedTwiceStoredOnce(s.payload, 'Message-ID: <spike-repeat@example.test>\r\nSubject: Repeat', {
        messageId: { equals: '<spike-repeat@example.test>' },
      }),
  ],
  [
    'a message without Message-ID accepted twice stores one row keyed by its content hash',
    (s) =>
      expectAcceptedTwiceStoredOnce(s.payload, 'Subject: Without id', {
        and: [{ subject: { equals: 'Without id' } }, { messageId: { like: 'sha256:' } }],
      }),
  ],
  ['the same message accepted concurrently stores one row', (s) => expectConcurrentAcceptStoredOnce(s.payload)],
]
