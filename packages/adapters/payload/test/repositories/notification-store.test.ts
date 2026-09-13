import { asId } from '@ops/kernel'
import type { NotificationInput } from '@ops/platform'
import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'
import { createNotificationStore } from '../../src/repositories'
import { fakePayload, type Handlers } from './fake-payload'

const INPUT: NotificationInput = {
  userId: asId('u1'),
  type: 'due_soon',
  dedupeKey: 'task:t1:due_soon:2026-09-13:u1',
  record: { type: 'task', id: asId('t1') },
  actorId: asId('u2'),
  data: { title: 'Write brief' },
}

function insert(handlers: Handlers) {
  const { payload, calls } = fakePayload(handlers)
  return { outcome: createNotificationStore(payload).insertIfAbsent(INPUT), calls }
}

const failingCreate = (error: Error): Handlers => ({
  create: () => {
    throw error
  },
})

describe('createNotificationStore inserts', () => {
  it('creates the notification as system work after an empty lookup', async () => {
    const { outcome, calls } = insert({})
    expect(await outcome).toBe('created')
    expect(calls.map((call) => call.args)).toMatchObject([
      {
        collection: 'notifications',
        where: { dedupeKey: { equals: INPUT.dedupeKey } },
        limit: 1,
        overrideAccess: true,
      },
      {
        collection: 'notifications',
        overrideAccess: true,
        data: {
          user: 'u1',
          type: 'due_soon',
          dedupeKey: INPUT.dedupeKey,
          recordType: 'task',
          recordId: 't1',
          actor: 'u2',
          data: { title: 'Write brief' },
        },
      },
    ])
  })
})

describe('createNotificationStore duplicates', () => {
  it('reports a duplicate found by lookup without creating', async () => {
    const { outcome, calls } = insert({ find: () => ({ docs: [{ id: 'n1' }] }) })
    expect(await outcome).toBe('duplicate')
    expect(calls.map((call) => call.method)).toEqual(['find'])
  })

  it('reports a duplicate when a concurrent insert trips the unique constraint', async () => {
    const validation = new ValidationError({ errors: [{ path: 'dedupe_key', message: 'Value must be unique' }] })
    const d1Error = new Error('Failed query: insert into "notifications"', {
      cause: new Error('D1_ERROR: UNIQUE constraint failed: notifications.dedupe_key: SQLITE_CONSTRAINT'),
    })
    expect(await insert(failingCreate(validation)).outcome).toBe('duplicate')
    expect(await insert(failingCreate(d1Error)).outcome).toBe('duplicate')
  })

  it('rethrows other create errors', async () => {
    const tooLong = new ValidationError({ errors: [{ path: 'dedupeKey', message: 'Value is too long' }] })
    const otherColumn = new Error('UNIQUE constraint failed: notifications.id')
    await expect(insert(failingCreate(tooLong)).outcome).rejects.toBe(tooLong)
    await expect(insert(failingCreate(otherColumn)).outcome).rejects.toBe(otherColumn)
  })
})
