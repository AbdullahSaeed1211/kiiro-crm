import { describe, expect, it } from 'vitest'
import { createIntakeStore } from '../../src/repositories/intake-store'
import { fakePayload } from './fake-payload'

const LEADS = 'leads'
const SUBMISSIONS = 'intakeSubmissions'
const SCHEDULE_ITEMS = 'scheduleItems'
const EXISTING_LEAD_ID = 'lead-existing'
const PERSON_EMAIL = 'person@example.test'
const LINKED_LEAD_ID = 'lead-linked'

describe('intake group notifications', () => {
  it('resolves active group members and creates one notification per selected recipient', async () => {
    const { payload, calls } = fakePayload({
      find: (args) =>
        args['collection'] === 'users' ? { docs: [{ id: 'u1' }, { id: 'u2' }, { id: 'u2' }] } : { docs: [] },
    })

    await createIntakeStore(payload).notify({
      userIds: ['u1'],
      groupIds: ['g1', 'g1', 'g2'],
      record: { type: 'lead', id: 'l1' },
      title: 'New lead',
    })

    expect(calls[0]?.args).toMatchObject({
      collection: 'users',
      where: {
        and: [{ or: [{ groups: { contains: 'g1' } }, { groups: { contains: 'g2' } }] }, { active: { equals: true } }],
      },
      overrideAccess: true,
    })
    expect(
      calls
        .filter((call) => call.method === 'create' && call.args['collection'] === 'notifications')
        .map((call) => (call.args['data'] as Record<string, unknown>)['user']),
    ).toEqual(['u1', 'u2'])
  })
})

it('reuses an unambiguous lead with the same normalized email', async () => {
  const { payload, calls } = fakePayload({
    find: (args) =>
      args['collection'] === LEADS
        ? { docs: [{ id: EXISTING_LEAD_ID, email: PERSON_EMAIL, phone: null }] }
        : { docs: [] },
  })

  const result = await createIntakeStore(payload).createLead({ email: ' Person@Example.Test ' })

  expect(result).toEqual({ id: EXISTING_LEAD_ID })
  expect(calls.some((call) => call.method === 'create' && call.args['collection'] === LEADS)).toBe(false)
})

it('continues paginated contact matching past the first page', async () => {
  const { payload, calls } = fakePayload({
    find: (args) => {
      if (args['collection'] !== LEADS) return { docs: [] }
      if (args['page'] === 1) return { docs: [{ id: 'lead-other', email: 'other@example.test' }], totalPages: 2 }
      return { docs: [{ id: 'lead-match', email: PERSON_EMAIL, owner: 'owner-1', assignees: [] }], totalPages: 2 }
    },
  })

  const result = await createIntakeStore(payload).createLead({ email: 'Person@example.test' })

  expect(result).toEqual({ id: 'lead-match' })
  expect(calls.filter((call) => call.method === 'find' && call.args['collection'] === LEADS)).toHaveLength(2)
})

function appointmentRoutingFixture() {
  const existingLead = {
    id: EXISTING_LEAD_ID,
    email: null,
    phone: '(212) 555-0100',
    owner: 'owner-1',
    assignees: ['sales-1', 'sales-2'],
  }
  let scheduleLookups = 0
  return fakePayload({
    find: (args) => {
      const collection = args['collection']
      if (collection === LEADS) {
        const where = args['where'] as Record<string, { equals?: string }> | undefined
        if (where?.['intakeSubmissionId'] !== undefined) return { docs: [] }
        return { docs: [existingLead] }
      }
      if (collection === SUBMISSIONS) return { docs: [] }
      if (collection === SCHEDULE_ITEMS) {
        scheduleLookups += 1
        return { docs: scheduleLookups === 1 ? [] : [{ id: 'schedule-existing' }] }
      }
      return { docs: [] }
    },
  })
}

it('reuses formatted-phone matches and carries lead routing into an intake appointment', async () => {
  const { payload, calls } = appointmentRoutingFixture()
  const result = await createIntakeStore(payload).createLead(
    { phone: '212.555.0100' },
    {
      submissionId: 'submission-1',
      items: [{ kind: 'appointment', sourceField: 'appointmentAt', startsAt: 1_800_000_000_000 }],
    },
  )
  const scheduleCreate = calls.find((call) => call.method === 'create' && call.args['collection'] === SCHEDULE_ITEMS)
  const contactScan = calls.find(
    (call) => call.method === 'find' && call.args['collection'] === LEADS && call.args['where'] === undefined,
  )

  expect(result).toEqual({ id: EXISTING_LEAD_ID })
  expect(scheduleCreate?.args['data']).toMatchObject({
    recordId: EXISTING_LEAD_ID,
    assignees: ['sales-1', 'sales-2', 'owner-1'],
    startsAt: 1_800_000_000_000,
  })
  expect(contactScan?.args['select']).toMatchObject({ owner: true, assignees: true })
  expect(calls.some((call) => call.method === 'update' && call.args['collection'] === SUBMISSIONS)).toBe(true)
})

it('resolves a saved submission lead link before matching a changed retry payload', async () => {
  const linkedLead = { id: LINKED_LEAD_ID, email: 'original@example.test', owner: 'owner-1', assignees: ['sales-1'] }
  const { payload, calls } = fakePayload({
    find: (args) => {
      if (args['collection'] === LEADS) {
        const where = args['where'] as Record<string, { equals?: string }> | undefined
        return where?.['id']?.equals === LINKED_LEAD_ID ? { docs: [linkedLead] } : { docs: [] }
      }
      if (args['collection'] === SUBMISSIONS) return { docs: [{ recordId: LINKED_LEAD_ID }] }
      return { docs: [] }
    },
  })

  const result = await createIntakeStore(payload).createLead(
    { email: 'changed@example.test' },
    { submissionId: 'submission-1', items: [] },
  )

  expect(result).toEqual({ id: LINKED_LEAD_ID })
  expect(calls.some((call) => call.method === 'create' && call.args['collection'] === LEADS)).toBe(false)
  expect(calls.some((call) => call.method === 'update' && call.args['collection'] === SUBMISSIONS)).toBe(false)
  expect(calls.some((call) => call.method === 'find' && call.args['collection'] === LEADS && !call.args['where'])).toBe(
    false,
  )
})
