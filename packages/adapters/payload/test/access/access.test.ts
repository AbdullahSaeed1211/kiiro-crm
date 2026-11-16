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

const STAFF_TASK_READ = {
  or: [
    {
      and: [
        {
          or: [
            { assignees: { in: ['s1'] } },
            { group: { in: ['g1'] } },
            { and: [{ 'project.members': { in: ['s1'] } }, { ownerOnly: { not_equals: true } }] },
          ],
        },
        { ownerOnly: { not_equals: true } },
      ],
    },
    {
      and: [
        { ownerOnly: { not_equals: true } },
        { or: [{ assignedById: { equals: 's1' } }, { watcherIds: { contains: 's1' } }] },
      ],
    },
  ],
}

describe('spike access', () => {
  it('denies anonymous requests and inactive users', async () => {
    expect(await SPIKE_ACCESS.tasks.read(request(null))).toBe(false)
    expect(await SPIKE_ACCESS.tasks.read(request(user('m1', 'manager', { active: false })))).toBe(false)
  })

  it('keeps owner-only tasks private and scopes staff to assignments, groups and project membership', async () => {
    expect(await SPIKE_ACCESS.tasks.read(request(user('m1', 'manager')))).toEqual({ ownerOnly: { not_equals: true } })
    const staff = request(user('s1', 'staff', { groups: [{ id: 'g1' }] }))
    expect(await SPIKE_ACCESS.tasks.read(staff)).toEqual(STAFF_TASK_READ)
  })

  it('does not let sales staff regain task access through assigner or watcher fields', async () => {
    const sales = request(user('s1', 'staff', { workProfile: 'sales' }))
    expect(await SPIKE_ACCESS.tasks.read(sales)).toBe(false)
    expect(await SPIKE_ACCESS.tasks.update(sales)).toBe(false)
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

  it('resolves the actor once across the requests one signed-in user makes', async () => {
    // Payload builds a fresh request for each local operation; the authenticated user object is shared by all of them.
    const signedIn = user('s1', 'staff')
    const first = request(signedIn, { s1: ['r1'] })
    const second = request(signedIn, { s1: ['r1'] })
    await SPIKE_ACCESS.projects.read(first)
    await SPIKE_ACCESS.projects.update(second)
    expect(first.queries() + second.queries()).toBe(2)
  })
})

describe('spike access for people', () => {
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
      workProfile: 'delivery',
      recordTypes: ['organization', 'contact', 'project', 'task'],
      unlinkedRecordTypes: [],
      groupIds: ['g1', 'g2'],
      reportIds: [],
    })
    expect(toActor({ id: 's1', role: 'staff', active: true, workProfile: 'sales' })).toMatchObject({
      workProfile: 'sales',
      recordTypes: ['lead'],
      unlinkedRecordTypes: [],
    })
  })

  it('scopes sales lead reads to the actor as owner or assignee only', async () => {
    const sales = request(user('s1', 'staff', { workProfile: 'sales' }))
    expect(await SPIKE_ACCESS.leads.read(sales)).toEqual({
      or: [{ assignees: { in: ['s1'] } }, { or: [{ owner: { equals: 's1' } }, { createdBy: { equals: 's1' } }] }],
    })
  })

  it('limits sales schedule reads to assigned lead events', async () => {
    const sales = request(user('s1', 'staff', { workProfile: 'sales' }))
    expect(await SPIKE_ACCESS.scheduleItems.read(sales)).toEqual({
      and: [{ assignees: { contains: 's1' } }, { recordType: { equals: 'lead' } }],
    })
  })
})
