/* eslint-disable max-lines, max-params -- the Payload adapter keeps the six narrow cron source ports together. */
import type { Id } from '@ops/kernel'
import type { RecordRef } from '@ops/platform'
import type { Payload, Where } from 'payload'
import { PEOPLE_COLLECTIONS } from '../collections/people'
import { isTerminalCategory } from '../collections/workflow-rules'
import { COLLECTIONS, FIELDS, RECORD_TYPES } from '../contracts/names'
import { fieldOf, idOf, idsOf, msOf, numberOf, textOf, type Doc } from './documents'
import { toWorkflow } from './workflow-mapping'

interface JobCursor {
  readonly id: string
  readonly updatedAt: number
}

interface JobTarget {
  readonly record: RecordRef
  readonly title: string
  readonly ownerId?: Id
  readonly assigneeIds?: readonly Id[]
  readonly updatedAt?: number
  readonly digestLocalTime?: string
}

interface JobRunStore {
  claim(job: string, window: string): Promise<boolean>
  getCursor(job: string): Promise<JobCursor | undefined>
  saveCursor(job: string, cursor: JobCursor | undefined): Promise<void>
}

interface JobSources {
  listExpiredInvitations(
    at: number,
    limit: number,
    cursor?: JobCursor,
  ): Promise<readonly { readonly id: Id; readonly expiresAt: number; readonly updatedAt?: number }[]>
  expireInvitation(id: Id): Promise<void>
  listOverdue(before: number, limit: number, cursor?: JobCursor): Promise<readonly JobTarget[]>
  listDigests(localDate: string, at: number, limit: number, cursor?: JobCursor): Promise<readonly JobTarget[]>
  listStalled(before: number, limit: number, cursor?: JobCursor): Promise<readonly JobTarget[]>
  deleteRejected(
    before: number,
    limit: number,
    cursor?: JobCursor,
  ): Promise<{ readonly rows: readonly { readonly id: string; readonly updatedAt: number }[] }>
}

const cursor = (doc: Doc) => {
  const value = fieldOf(doc, 'cursor')
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  const id = record['id']
  const updatedAt = record['updatedAt']
  return typeof id === 'string' && typeof updatedAt === 'number' ? { id, updatedAt } : undefined
}

async function claimJob(payload: Payload, job: string, window: string): Promise<boolean> {
  const windowStart = Number(window.slice(window.lastIndexOf(':') + 1))
  const where: Where = { and: [{ job: { equals: job } }, { windowStart: { equals: windowStart } }] }
  const found = await payload.find({ collection: COLLECTIONS.jobRuns, where, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs.length > 0) return false
  try {
    await payload.create({
      collection: COLLECTIONS.jobRuns,
      data: { job, windowStart, status: 'running' },
      overrideAccess: true,
    })
    return true
  } catch (error) {
    if (error instanceof Error && /unique constraint failed/i.test(error.message)) return false
    throw error
  }
}

async function latestRun(payload: Payload, job: string, status?: string) {
  const page = await payload.find({
    collection: COLLECTIONS.jobRuns,
    where:
      status === undefined
        ? { job: { equals: job } }
        : { and: [{ job: { equals: job } }, { status: { equals: status } }] },
    sort: '-windowStart',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs[0]
}

/** Payload-backed idempotency and continuation state for scheduled jobs. */
export function createJobRunStore(payload: Payload): JobRunStore {
  return {
    claim: (job, window) => claimJob(payload, job, window),
    getCursor: async (job) => {
      // A successful claim inserts a new running row before the dispatcher asks for a cursor.
      // Read the previous completed run so that the new row's empty cursor is never used.
      const row = await latestRun(payload, job, 'completed')
      return row === undefined ? undefined : cursor(row)
    },
    saveCursor: async (job, value) => {
      const row = await latestRun(payload, job)
      if (row !== undefined)
        await payload.update({
          collection: COLLECTIONS.jobRuns,
          id: row.id,
          data: {
            cursor: value === undefined ? null : { id: value.id, updatedAt: value.updatedAt },
            status: 'completed',
          },
          overrideAccess: true,
        })
    },
  }
}

function afterCursor(cursorValue: JobCursor | undefined, field = 'updatedAt'): Where | undefined {
  if (cursorValue === undefined) return undefined
  const timestamp = new Date(cursorValue.updatedAt).toISOString()
  return {
    or: [
      { [field]: { greater_than: timestamp } },
      { and: [{ [field]: { equals: timestamp } }, { id: { greater_than: cursorValue.id } }] },
    ],
  }
}

function withCursor(clauses: readonly Where[], cursorValue: JobCursor | undefined, field = 'updatedAt'): Where {
  const continuation = afterCursor(cursorValue, field)
  return continuation === undefined ? { and: [...clauses] } : { and: [...clauses, continuation] }
}

function isAfterCursor(updatedAt: number | undefined, id: string, cursorValue: JobCursor | undefined): boolean {
  return (
    cursorValue === undefined ||
    (updatedAt !== undefined &&
      (updatedAt > cursorValue.updatedAt || (updatedAt === cursorValue.updatedAt && id > cursorValue.id)))
  )
}

async function terminalStages(
  payload: Payload,
  recordTypes: readonly string[],
): Promise<ReadonlyMap<string, ReadonlySet<string>>> {
  const page = await payload.find({
    collection: COLLECTIONS.workflows,
    where: { recordType: { in: [...recordTypes] } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const result = new Map<string, Set<string>>()
  for (const doc of page.docs) {
    const workflow = toWorkflow(doc)
    if (workflow === undefined || !recordTypes.includes(workflow.recordType)) continue
    const ids = result.get(workflow.recordType) ?? new Set<string>()
    for (const stage of workflow.stages) if (isTerminalCategory(stage.category)) ids.add(stage.id)
    result.set(workflow.recordType, ids)
  }
  return result
}

function openStageClause(terminal: ReadonlySet<string> | undefined): Where | undefined {
  if (terminal === undefined || terminal.size === 0) return undefined
  // SQL `NOT IN` is not true for NULL, and a record without a stage is open.
  return { or: [{ stageId: { not_in: [...terminal] } }, { stageId: { exists: false } }] }
}

function isOpenStage(doc: Doc, terminal: ReadonlySet<string> | undefined): boolean {
  return terminal?.has(textOf(doc, 'stageId') ?? '') !== true
}

function target(doc: Doc, type: string): JobTarget[] {
  const id = idOf(fieldOf(doc, 'id'))
  if (id === undefined) return []
  const ownerId = idOf(fieldOf(doc, FIELDS.owner))
  const assigneeIds = idsOf(fieldOf(doc, FIELDS.assignees))
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  return [
    {
      record: { type, id },
      title: textOf(doc, 'title') ?? textOf(doc, 'name') ?? '',
      ...(ownerId === undefined ? {} : { ownerId }),
      ...(assigneeIds.length === 0 ? {} : { assigneeIds }),
      ...(updatedAt === undefined ? {} : { updatedAt }),
    },
  ]
}

async function recordTargets(
  payload: Payload,
  before: number,
  limit: number,
  cursorValue?: JobCursor,
): Promise<readonly JobTarget[]> {
  if (limit <= 0) return []
  const cutoff = new Date(before).toISOString()
  const terminals = await terminalStages(payload, [RECORD_TYPES.leads, RECORD_TYPES.deals, RECORD_TYPES.projects])
  const collections = [
    [COLLECTIONS.leads, RECORD_TYPES.leads],
    [COLLECTIONS.deals, RECORD_TYPES.deals],
    [COLLECTIONS.projects, RECORD_TYPES.projects],
  ] as const
  const pages = await Promise.all(
    collections.map(([collection, type]) => {
      const clauses: Where[] = [{ updatedAt: { less_than: cutoff } }]
      const open = openStageClause(terminals.get(type))
      if (open !== undefined) clauses.push(open)
      return payload.find({
        collection,
        where: withCursor(clauses, cursorValue),
        sort: 'updatedAt',
        limit,
        depth: 0,
        overrideAccess: true,
      })
    }),
  )
  return pages
    .flatMap((page, index) => {
      const type = collections[index]?.[1] ?? ''
      return page.docs.flatMap((doc) => (isOpenStage(doc, terminals.get(type)) ? target(doc, type) : []))
    })
    .filter((row) => isAfterCursor(row.updatedAt, row.record.id, cursorValue))
    .toSorted((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0) || a.record.id.localeCompare(b.record.id))
    .slice(0, limit)
}

async function expiredInvitations(payload: Payload, at: number, limit: number, cursorValue?: JobCursor) {
  if (limit <= 0) return []
  const page = await payload.find({
    collection: PEOPLE_COLLECTIONS.invitations,
    where: withCursor(
      [{ status: { equals: 'pending' } }, { expiresAt: { less_than_equal: at } }],
      cursorValue,
      'expiresAt',
    ),
    sort: 'expiresAt',
    limit,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs.flatMap((doc) => {
    const id = idOf(fieldOf(doc, 'id'))
    const expiresAt = numberOf(doc, 'expiresAt')
    return id === undefined || expiresAt === null || !isAfterCursor(expiresAt, String(id), cursorValue)
      ? []
      : [{ id, expiresAt }]
  })
}

async function overdueTargets(payload: Payload, before: number, limit: number, cursorValue?: JobCursor) {
  if (limit <= 0) return []
  const terminals = await terminalStages(payload, [RECORD_TYPES.tasks])
  const clauses: Where[] = [{ dueAt: { less_than: before } }]
  const open = openStageClause(terminals.get(RECORD_TYPES.tasks))
  if (open !== undefined) clauses.push(open)
  const page = await payload.find({
    collection: COLLECTIONS.tasks,
    where: withCursor(clauses, cursorValue),
    sort: 'updatedAt',
    limit,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs
    .filter((doc) => isOpenStage(doc, terminals.get(RECORD_TYPES.tasks)))
    .flatMap((doc) => target(doc, RECORD_TYPES.tasks))
    .filter((row) => isAfterCursor(row.updatedAt, row.record.id, cursorValue))
    .slice(0, limit)
}

async function digestTargets(payload: Payload, limit: number, cursorValue?: JobCursor): Promise<readonly JobTarget[]> {
  if (limit <= 0) return []
  const page = await payload.find({
    collection: PEOPLE_COLLECTIONS.notificationPrefs,
    where: withCursor([{ digestLocalTime: { exists: true } }], cursorValue),
    sort: 'updatedAt',
    limit,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs
    .flatMap((doc) => {
      const ownerId = idOf(fieldOf(doc, FIELDS.user))
      const digestLocalTime = textOf(doc, 'digestLocalTime')
      const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
      return ownerId === undefined || digestLocalTime === undefined
        ? []
        : [
            {
              record: { type: 'user', id: ownerId },
              title: 'Daily digest',
              ownerId,
              digestLocalTime,
              ...(updatedAt === undefined ? {} : { updatedAt }),
            },
          ]
    })
    .filter((row) => isAfterCursor(row.updatedAt, row.record.id, cursorValue))
}

async function purgeRejected(payload: Payload, before: number, limit: number, cursorValue?: JobCursor) {
  if (limit <= 0) return { rows: [] }
  const page = await payload.find({
    collection: COLLECTIONS.intakeSubmissions,
    where: withCursor(
      [{ receivedAt: { less_than: before } }, { status: { in: ['rejected_spam', 'rejected_invalid'] } }],
      cursorValue,
      'receivedAt',
    ),
    sort: 'receivedAt',
    limit,
    depth: 0,
    overrideAccess: true,
  })
  for (const doc of page.docs)
    await payload.delete({ collection: COLLECTIONS.intakeSubmissions, id: doc.id, overrideAccess: true })
  return {
    rows: page.docs
      .map((doc) => ({ id: String(doc.id), updatedAt: numberOf(doc, 'receivedAt') ?? 0 }))
      .filter((row) => isAfterCursor(row.updatedAt, row.id, cursorValue)),
  }
}

/** Payload read and mutation ports for the non-due-soon scheduled jobs. */
export function createJobSources(payload: Payload, stalledDays: number): JobSources {
  return {
    listExpiredInvitations: (at, limit, cursorValue) => expiredInvitations(payload, at, limit, cursorValue),
    expireInvitation: async (id) => {
      await payload.update({
        collection: PEOPLE_COLLECTIONS.invitations,
        id,
        data: { status: 'expired' },
        overrideAccess: true,
      })
    },
    listOverdue: (before, limit, cursorValue) => overdueTargets(payload, before, limit, cursorValue),
    listDigests: (_localDate, _at, limit, cursorValue) => digestTargets(payload, limit, cursorValue),
    listStalled: (before, limit, cursorValue) =>
      recordTargets(payload, before - stalledDays * 86_400_000, limit, cursorValue),
    deleteRejected: (before, limit, cursorValue) => purgeRejected(payload, before, limit, cursorValue),
  }
}
