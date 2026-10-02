import { expect, test, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''

/** Pages that share one view switcher; switching views must not move it. */
const SWITCHER_GROUPS: readonly (readonly string[])[] = [
  ['/leads', '/leads/board', '/leads/follow-ups'],
  ['/deals', '/deals/board'],
  ['/tasks', '/tasks/board', '/calendar', '/timeline'],
]

/** The most a page may shift while loading and settling (Google rates under 0.1 as good). */
const MAX_SHIFT = 0.1

/** The header layout under test is the desktop one; the phone layout has its own checks. */
function isDesktop(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) > 390
}

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(OWNER_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 60_000 })
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
  test.beforeEach(async ({ page }) => {
    // The phone header is a different layout, covered by the mobile checks elsewhere.
    test.skip(!isDesktop(page), 'desktop header layout')
    await signIn(page)
  })

  for (const group of SWITCHER_GROUPS) {
    test(`the view switcher stays put across ${group.join(', ')}`, async ({ page }) => {
      const edges: number[] = []
      for (const route of group) edges.push(await switcherRightEdge(page, route))
      expect(new Set(edges).size, `right edges ${edges.join(', ')}`).toBe(1)
    })
  }

  for (const route of ['/leads', '/leads/board', '/deals', '/deals/board', '/tasks', '/tasks/board', '/reports']) {
    test(`${route} does not shift while loading`, async ({ page }) => {
      expect(await layoutShift(page, route)).toBeLessThan(MAX_SHIFT)
    })
  }
})
