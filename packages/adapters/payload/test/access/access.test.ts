import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import { toActor } from '../../src/access/actor'
import { canUseAdmin, SPIKE_ACCESS } from '../../src/access/spike-access'

type UserDoc = Record<string, unknown>

interface FindArgs {
  readonly where: Readonly<Record<string, { readonly in: readonly string[] } | undefined>>
}

function request(user: UserDoc | null, reportsByManager: Readonly<Record<string, readonly string[]>> = {}) {
  let queries = 0
  const find = (args: FindArgs) => {
    queries += 1
    const managers = args.where['reportsTo']?.in ?? []
    const docs = managers.flatMap((id) => (reportsByManager[id] ?? []).map((reportId) => ({ id: reportId })))
    return Promise.resolve({ docs })
  }
  const req = { user, payload: { find } } as unknown as PayloadRequest
  return { req, queries: () => queries }
}

const user = (id: string, role: string, extra: UserDoc = {}): UserDoc => ({
  id,
  role,
  active: true,
  groups: [],
  ...extra,
})

describe('spike access', () => {
  it('denies anonymous requests and inactive users', async () => {
    expect(await SPIKE_ACCESS.tasks.read(request(null))).toBe(false)
    expect(await SPIKE_ACCESS.tasks.read(request(user('m1', 'manager', { active: false })))).toBe(false)
  })

  it('lets managers read every task and scopes staff to assignments, groups and project membership', async () => {
    expect(await SPIKE_ACCESS.tasks.read(request(user('m1', 'manager')))).toBe(true)
    const staff = request(user('s1', 'staff', { groups: [{ id: 'g1' }] }))
    expect(await SPIKE_ACCESS.tasks.read(staff)).toEqual({
      or: [{ assignees: { in: ['s1'] } }, { group: { in: ['g1'] } }, { 'project.members': { in: ['s1'] } }],
    })
  })

  it('includes transitive reports in the owner branch and stops on reporting cycles', async () => {
    const chain = request(user('s1', 'staff'), { s1: ['r1'], r1: ['r2', 's1'] })
    expect(await SPIKE_ACCESS.organizations.read(chain)).toEqual({ or: [{ owner: { in: ['s1', 'r1', 'r2'] } }] })
  })

  it('resolves the actor and its reports once per request', async () => {
    const staff = request(user('s1', 'staff'), { s1: ['r1'] })
    await SPIKE_ACCESS.projects.read(staff)
    await SPIKE_ACCESS.projects.update(staff)
    expect(staff.queries()).toBe(2)
  })

  it('applies the user update rules per role', async () => {
    expect(await SPIKE_ACCESS.users.update(request(user('o1', 'owner')))).toBe(true)
    expect(await SPIKE_ACCESS.users.update(request(user('m1', 'manager')))).toEqual({
      or: [{ id: { equals: 'm1' } }, { role: { equals: 'staff' } }],
    })
    expect(await SPIKE_ACCESS.users.update(request(user('s1', 'staff')))).toEqual({ id: { equals: 's1' } })
  })

  it('keeps notifications to their user and system writes away from every role', async () => {
    expect(await SPIKE_ACCESS.notifications.read(request(user('s1', 'staff')))).toEqual({ user: { equals: 's1' } })
    expect(await SPIKE_ACCESS.activity.create(request(user('o1', 'owner')))).toBe(false)
    expect(await SPIKE_ACCESS.users.delete(request(user('o1', 'owner')))).toBe(false)
  })

  it('opens the admin panel to owners and managers only', async () => {
    expect(await canUseAdmin(request(user('m1', 'manager')))).toBe(true)
    expect(await canUseAdmin(request(user('s1', 'staff')))).toBe(false)
  })
})

describe('toActor', () => {
  it('treats unknown roles as inactive staff and reads populated group relations', () => {
    expect(toActor({ id: 'x', role: 'admin', active: true })).toMatchObject({ role: 'staff', active: false })
    expect(toActor({ id: 7, role: 'staff', active: true, groups: ['g1', { id: 'g2' }] })).toEqual({
      id: '7',
      role: 'staff',
      active: true,
      groupIds: ['g1', 'g2'],
      reportIds: [],
    })
  })
})
