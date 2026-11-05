import { fileURLToPath } from 'node:url'
import { expect, test, type Cookie, type Page } from '@playwright/test'
import { sessionCookies } from '../helpers/session'

// UX 3: a broken layout passed every check because nothing compared what the page looked like. These diffs
// cover the frame of the core surfaces: sidebar, app header, page title, tabs and actions. The seed is fixed but
// its dates are relative to today, so the record area, nav counts and dated text are hidden before comparing.
const ROUTES = [
  ['today', '/'],
  ['my-tasks', '/my-tasks'],
  ['tasks', '/tasks'],
  ['calendar', '/calendar'],
  ['timeline', '/timeline'],
  ['leads', '/leads'],
  ['deals', '/deals'],
  ['clients', '/organizations'],
  ['billing', '/billing'],
  ['reports', '/reports'],
  ['settings', '/settings/general'],
] as const

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const

/** Hides everything that changes with the data or the day; the frame around it is what the diff guards. */
const HIDE_DYNAMIC = fileURLToPath(new URL('./visual-hide.css', import.meta.url))

let cookies: Cookie[] = []
test.beforeAll(async ({ browser }) => {
  cookies = await sessionCookies(browser, 'owner')
})

async function firstClientPath(page: Page): Promise<string> {
  const response = await page.request.get('/api/v1/organizations?limit=1')
  const body = (await response.json()) as { data: { records: { id: string }[] } }
  const id = body.data.records[0]?.id
  expect(id, 'the seed has a client').toBeDefined()
  return `/organizations/${String(id)}`
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} frame`, () => {
    // Snapshots are per browser; the desktop project (Chromium) owns them and sets both widths itself.
    test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium baselines only')

    for (const [name, route] of ROUTES) {
      test(`${name} matches its baseline`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.context().addCookies(cookies)
        await page.goto(route, { waitUntil: 'networkidle' })
        await expect(page.locator('main h1').first()).toBeVisible()
        await expect(page).toHaveScreenshot(`${name}-${viewport.name}.png`, {
          stylePath: HIDE_DYNAMIC,
          animations: 'disabled',
          maxDiffPixels: 50,
        })
      })
    }

    test('client page matches its baseline', async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.context().addCookies(cookies)
      await page.goto(await firstClientPath(page), { waitUntil: 'networkidle' })
      await expect(page.locator('.ops-record-page')).toBeVisible()
      await expect(page).toHaveScreenshot(`client-${viewport.name}.png`, {
        stylePath: HIDE_DYNAMIC,
        animations: 'disabled',
        maxDiffPixels: 50,
      })
    })
  })
}
