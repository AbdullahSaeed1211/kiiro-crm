import { describe, expect, it } from 'vitest'
import { createLinks, navEntries, navSections, type NavViewer } from '../../src/app/(app)/app-navigation'

const ALL = { crm: true, work: true, intake: true, mail: true }
const viewer = (overrides: Partial<NavViewer>): NavViewer => ({
  modules: ALL,
  terminology: {},
  role: 'staff',
  workProfile: 'delivery',
  locale: 'en',
  ...overrides,
})
const hrefs = (given: NavViewer) => navEntries(navSections(given)).map((entry) => entry.href)

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

  it('gives owners everything and sales staff the sales desk with their own tasks only', () => {
    expect(hrefs(viewer({ role: 'owner' }))).toEqual(expect.arrayContaining(['/leads', '/reports', '/inbox', '/team']))
    const sales = hrefs(viewer({ workProfile: 'sales' }))
    expect(sales).toEqual(expect.arrayContaining(['/leads', '/sales']))
    expect(sales).not.toContain('/projects')
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
