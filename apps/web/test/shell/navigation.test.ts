import { describe, expect, it } from 'vitest'
import { createLinks, isNavActive, navEntries, navSections, type NavViewer } from '../../src/app/(app)/app-navigation'
import { salesRouteAllowed } from '../../src/server/auth/sales-route'
import { asId } from '@ops/kernel'
import type { Actor } from '@ops/platform'

const ALL = { crm: true, work: true, intake: true, mail: true }
const LEADS = '/leads'
const LEAD_INTAKE = `${LEADS}/intake`
const viewer = (overrides: Partial<NavViewer>): NavViewer => ({
  modules: ALL,
  terminology: {},
  role: 'staff',
  workProfile: 'delivery',
  locale: 'en',
  ...overrides,
})
const hrefs = (given: NavViewer) => navEntries(navSections(given)).map((entry) => entry.href)
const salesActor: Actor = {
  id: asId('sales-1'),
  role: 'staff',
  workProfile: 'sales',
  active: true,
  groupIds: [],
  reportIds: [],
}

// The command menu and the `g` shortcuts read this list, so a link missing here is unreachable for that person.
describe('navigation model', () => {
  it('keeps sales, billing and reports away from delivery staff', () => {
    const links = hrefs(viewer({}))
    for (const hidden of ['/leads', '/deals', '/sales', '/reports', '/billing', '/inbox', '/team']) {
      expect(links).not.toContain(hidden)
    }
    expect(links).toContain('/my-tasks')
    expect(createLinks(viewer({})).map((link) => link.key)).not.toContain('newLead')
  })

  it('drops what a switched-off module owns', () => {
    const links = hrefs(viewer({ role: 'owner', modules: { ...ALL, crm: false, mail: false } }))
    expect(links).not.toContain('/leads')
    expect(links).not.toContain('/inbox')
    expect(createLinks(viewer({ role: 'owner', modules: { ...ALL, crm: false } })).map((link) => link.key)).toEqual([
      'newTask',
      'newProject',
    ])
  })

  it('gives every link a different go-to key', () => {
    const keys = navEntries(navSections(viewer({ role: 'owner' }))).flatMap((entry) => entry.shortcut ?? [])
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('sales navigation and route access', () => {
  it('gives owners everything and sales staff only leads and intake', () => {
    expect(hrefs(viewer({ role: 'owner' }))).toEqual(expect.arrayContaining(['/leads', '/reports', '/inbox', '/team']))
    expect(hrefs(viewer({ workProfile: 'sales' }))).toEqual([LEADS, LEAD_INTAKE])
    expect(createLinks(viewer({ workProfile: 'sales' })).map((link) => link.href)).toEqual([`${LEADS}/new`])
  })

  it('allows sales staff only to view leads and intake', () => {
    expect(salesRouteAllowed(salesActor, LEADS)).toBe(true)
    expect(salesRouteAllowed(salesActor, `${LEADS}/new`)).toBe(true)
    expect(salesRouteAllowed(salesActor, LEAD_INTAKE)).toBe(true)
    expect(salesRouteAllowed(salesActor, `${LEADS}/lead-1`)).toBe(true)
    expect(salesRouteAllowed(salesActor, '/attendance')).toBe(false)
  })

  it('rejects other routes and keeps exactly one sales nav item active', () => {
    expect(salesRouteAllowed(salesActor, '/leads/board')).toBe(false)
    expect(salesRouteAllowed(salesActor, '/leadsWhatever')).toBe(false)
    expect(salesRouteAllowed({ ...salesActor, role: 'owner' }, '/attendance')).toBe(true)
    expect(isNavActive(LEAD_INTAKE, LEADS)).toBe(false)
    expect(isNavActive(LEAD_INTAKE, LEAD_INTAKE)).toBe(true)
  })
})
