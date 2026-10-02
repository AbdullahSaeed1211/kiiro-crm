import { expect, test, type Cookie, type Page } from '@playwright/test'
import { sessionCookies } from '../helpers/session'

/** Pages that share one view switcher; switching views must not move it. */
const SWITCHER_GROUPS: readonly (readonly string[])[] = [
  ['/leads', '/leads/board', '/leads/follow-ups'],
  ['/deals', '/deals/board'],
  ['/tasks', '/tasks/board', '/calendar', '/timeline'],
]

/** Every main surface, so a new shift on any of them fails here. */
const SHIFT_ROUTES = [
  '/',
  '/leads',
  '/leads/board',
  '/leads/follow-ups',
  '/deals',
  '/deals/board',
  '/contacts',
  '/organizations',
  '/projects',
  '/tasks',
  '/tasks/board',
  '/my-tasks',
  '/calendar',
  '/timeline',
  '/inbox',
  '/reports',
  '/settings/general',
  '/settings/members',
  '/settings/import',
] as const

/** The most a page may shift while loading and settling (Google rates under 0.1 as good). */
const MAX_SHIFT = 0.1

/** The header layout under test is the desktop one; the phone layout has its own checks. */
function isDesktop(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) > 390
}

async function switcherRightEdge(page: Page, route: string): Promise<number> {
  await page.goto(route, { waitUntil: 'networkidle' })
  const box = await page.locator('nav[aria-label*="views" i]').first().boundingBox()
  if (box === null) throw new Error(`${route} has no view switcher`)
  return Math.round(box.x + box.width)
}

/** Resolves after two paints, so shifts from late-arriving content have been recorded. */
function nextFrames(): Promise<void> {
  return new Promise((done) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        done()
      })
    })
  })
}

async function layoutShift(page: Page, route: string): Promise<number> {
  await page.addInitScript(() => {
    const holder = window as unknown as { __shift: number }
    holder.__shift = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
        if (!shift.hadRecentInput) holder.__shift += shift.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(route, { waitUntil: 'networkidle' })
  await page.evaluate(nextFrames)
  return page.evaluate(() => (window as unknown as { __shift: number }).__shift)
}

test.describe('layout stability', () => {
  // One worker at a time: parallel sign-ins hit the login rate limit.
  test.describe.configure({ mode: 'serial' })
  let cookies: Cookie[] = []
  test.beforeAll(async ({ browser }) => {
    cookies = await sessionCookies(browser, 'owner')
  })
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies(cookies)
  })

  for (const group of SWITCHER_GROUPS) {
    test(`the view switcher stays put across ${group.join(', ')}`, async ({ page }) => {
      // The phone header is a different layout, so only the load-shift checks run there.
      test.skip(!isDesktop(page), 'desktop header layout')
      const edges: number[] = []
      for (const route of group) edges.push(await switcherRightEdge(page, route))
      expect(new Set(edges).size, `right edges ${edges.join(', ')}`).toBe(1)
    })
  }

  for (const route of SHIFT_ROUTES) {
    test(`${route} does not shift while loading`, async ({ page }) => {
      expect(await layoutShift(page, route)).toBeLessThan(MAX_SHIFT)
    })
  }
})
