import { describe, expect, it, vi } from 'vitest'
import type * as PayloadModule from 'payload'
import { createScheduleDueItemSource } from '../../src/repositories/schedule-reminder-source'
import { fakePayload } from './fake-payload'

vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof PayloadModule>()
  return {
    ...actual,
    createLocalReq: ({ user }: { user: Readonly<Record<string, unknown>> }, payload: unknown) =>
      Promise.resolve({ user, payload, context: {} }),
  }
})

vi.mock('../../src/collections/collaboration/fields', () => ({
  canReadParentReference: (
    req: { user: Readonly<Record<string, unknown>> },
    reference: { recordType: string; recordId: string },
  ) => {
    const readable = req.user['readableRecords']
    const allowed =
      Array.isArray(readable) &&
      (readable.includes('*') || readable.includes(`${reference.recordType}:${reference.recordId}`))
    return Promise.resolve(allowed)
  },
}))

const FROM = Date.UTC(2026, 8, 13, 12)
const TO = FROM + 24 * 60 * 60 * 1000
const UPDATED = new Date(FROM - 60_000).toISOString()
const ASSIGNED_USER = 'assigned-user'
const PRIVATE_USER = 'private-user'
const INACTIVE_USER = 'inactive-user'

const item = (id: string, values: Readonly<Record<string, unknown>> = {}) => ({
  id,
  recordId: `lead-${id}`,
  recordType: 'lead',
  kind: 'callback',
  status: 'scheduled',
  startsAt: FROM + 60_000,
  updatedAt: UPDATED,
  assignees: [ASSIGNED_USER],
  title: `Call ${id}`,
  ...values,
})

function setup(docs: readonly object[]) {
  const { payload, calls } = fakePayload({
    find: (args) =>
      args['collection'] === 'scheduleItems'
        ? { docs }
        : {
            docs: [
              { id: ASSIGNED_USER, active: true, readableRecords: ['*'] },
              { id: PRIVATE_USER, active: true, readableRecords: [] },
              { id: INACTIVE_USER, active: false, readableRecords: ['*'] },
            ],
          },
  })
  return { source: createScheduleDueItemSource(payload), calls }
}

// eslint-disable-next-line max-lines-per-function -- the focused cases share one reusable Payload fixture.
describe('createScheduleDueItemSource', () => {
  it('queries scheduled assigned rows in the half-open time window as system work', async () => {
    const { source, calls } = setup([])
    await source.listDueWithin(FROM, TO, 40)
    expect(calls[0]?.args).toMatchObject({
      collection: 'scheduleItems',
      where: {
        and: [
          { startsAt: { greater_than_equal: FROM } },
          { startsAt: { less_than: TO } },
          { status: { equals: 'scheduled' } },
          { assignees: { exists: true } },
        ],
      },
      sort: ['updatedAt', 'id'],
      limit: 40,
      overrideAccess: true,
    })
    expect(await source.listDueWithin(FROM, TO, 0)).toEqual([])
    expect(calls).toHaveLength(1)
  })

  it('keeps scheduled rows while filtering recipients to active parent readers', async () => {
    const { source } = setup([
      item('start', { startsAt: FROM }),
      item('appointment', { kind: 'appointment', recordType: 'contact', recordId: 'contact-1' }),
      item('private', { assignees: [PRIVATE_USER] }),
      item('inactive', { assignees: [INACTIVE_USER] }),
      item('end', { startsAt: TO }),
      item('early', { startsAt: FROM - 1 }),
      item('cancelled', { status: 'cancelled' }),
      item('completed', { status: 'completed' }),
      item('invalid-record', { recordType: 'deal' }),
    ])
    const rows = await source.listDueWithin(FROM, TO, 40)
    expect(rows.map((row) => [row.dedupeId, row.record.type, row.record.id, row.assigneeIds])).toEqual([
      ['start', 'lead', 'lead-start', [ASSIGNED_USER]],
      ['appointment', 'contact', 'contact-1', [ASSIGNED_USER]],
      ['private', 'lead', 'lead-private', []],
      ['inactive', 'lead', 'lead-inactive', []],
    ])
    expect(rows[1]?.notificationData).toEqual({
      schedule: { id: 'appointment', kind: 'appointment', startsAt: FROM + 60_000 },
    })
  })

  it('continues after the schedule-row updatedAt and id cursor', async () => {
    const sameTime = new Date(FROM).toISOString()
    const { source, calls } = setup([
      item('before', { updatedAt: sameTime }),
      item('same', { updatedAt: sameTime }),
      item('newer', { updatedAt: new Date(FROM + 1).toISOString() }),
    ])
    const rows = await source.listDueWithin(FROM, TO, 20, { id: 'before', updatedAt: FROM })
    expect(rows.map((row) => row.dedupeId)).toEqual(['same', 'newer'])
    const timestamp = new Date(FROM).toISOString()
    expect(calls[0]?.args['where']).toEqual({
      and: [
        { startsAt: { greater_than_equal: FROM } },
        { startsAt: { less_than: TO } },
        { status: { equals: 'scheduled' } },
        { assignees: { exists: true } },
        {
          or: [
            { updatedAt: { greater_than: timestamp } },
            { and: [{ updatedAt: { equals: timestamp } }, { id: { greater_than: 'before' } }] },
          ],
        },
      ],
    })
  })

  it('returns filtered rows as cursor progress so inaccessible assignments cannot starve a later reminder', async () => {
    const docs = [
      item('private-a', { assignees: [PRIVATE_USER] }),
      item('private-b', { assignees: [PRIVATE_USER] }),
      item('valid-c', { assignees: [ASSIGNED_USER] }),
    ]
    let page = 0
    const { payload } = fakePayload({
      find: (args) => {
        if (args['collection'] === 'scheduleItems') {
          const current = page++
          return { docs: current === 0 ? docs.slice(0, 2) : docs.slice(2) }
        }
        return {
          docs: [
            { id: ASSIGNED_USER, active: true, readableRecords: ['*'] },
            { id: PRIVATE_USER, active: true, readableRecords: [] },
          ],
        }
      },
    })
    const source = createScheduleDueItemSource(payload)

    const firstPage = await source.listDueWithin(FROM, TO, 2)
    const last = firstPage[firstPage.length - 1]
    expect(firstPage.map((row) => row.assigneeIds)).toEqual([[], []])
    expect(last).toBeDefined()
    const nextPage = await source.listDueWithin(FROM, TO, 2, {
      id: last?.dedupeId ?? '',
      updatedAt: last?.updatedAt ?? 0,
    })
    expect(nextPage.map((row) => [row.dedupeId, row.assigneeIds])).toEqual([['valid-c', [ASSIGNED_USER]]])
  })
})
