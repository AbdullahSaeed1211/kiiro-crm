import { expect, test, type Cookie } from '@playwright/test'
import { sessionCookies } from '../helpers/session'

// UX 45: a screen must not move after it paints. The phone timeline once inserted its Grid/Chart toggle at hydration
// and scored 0.2. A layout-shift observer is the only way to see this; a bounding-box check misses it.
const ROUTES = ['/', '/my-tasks', '/tasks', '/timeline', '/calendar', '/leads', '/deals', '/organizations', '/reports']
const BUDGET = 0.02

// Both widths are set in the test, so the check runs in any project.
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
]

let cookies: Cookie[] = []
test.beforeAll(async ({ browser }) => {
  cookies = await sessionCookies(browser, 'owner')
})

for (const viewport of VIEWPORTS) {
  for (const route of ROUTES) {
    test(`${route} does not shift after it paints at ${viewport.name} width`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.context().addCookies(cookies)
      await page.addInitScript(() => {
        const w = window as unknown as { __cls: number }
        w.__cls = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
            if (!shift.hadRecentInput) w.__cls += shift.value
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await page.goto(route, { waitUntil: 'networkidle' })
      // Late shifts (hydration, data arriving) happen after load, so watch until two seconds have passed.
      await page.waitForFunction(() => performance.now() > 2500)
      const total = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
      expect(total).toBeLessThan(BUDGET)
    })
  }
}
