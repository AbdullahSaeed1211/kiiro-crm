import { describe, expect, it } from 'vitest'
import { createIntakeStore } from '../../src/repositories/intake-store'
import { fakePayload } from './fake-payload'

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

describe('intake lead matching', () => {
  it('reuses an unambiguous lead with the same normalized email', async () => {
    const { payload, calls } = fakePayload({
      find: (args) =>
        args['collection'] === 'leads'
          ? { docs: [{ id: 'lead-existing', email: 'person@example.test', phone: null }] }
          : { docs: [] },
    })

    const result = await createIntakeStore(payload).createLead({ email: ' Person@Example.Test ' })

    expect(result).toEqual({ id: 'lead-existing' })
    expect(calls.some((call) => call.method === 'create' && call.args['collection'] === 'leads')).toBe(false)
  })
})
