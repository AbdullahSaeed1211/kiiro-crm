import { expect, test, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Parity rows 43, 44 and 46: settings follow the person's role, show the tenant's brand, and switches change behavior.
test.describe.configure({ mode: 'serial' })

const SETTINGS_ROUTES = ['/settings/workflows', '/settings/fields', '/settings/members', '/settings/groups']
const OWNER_ONLY_ROUTES = ['/settings/branding', '/settings/modules', '/settings/email']

test('a manager reaches work settings but not workspace settings, and staff reach none', async ({ page, browser }) => {
  test.setTimeout(120_000)
  await signInAs(page, 'manager')
  for (const route of SETTINGS_ROUTES) expect((await page.goto(route))?.status(), route).toBe(200)
  for (const route of OWNER_ONLY_ROUTES) expect((await page.goto(route))?.status(), route).toBe(404)
  // Workspace general settings can be read by a manager but not changed.
  expect((await page.goto('/settings/general'))?.status()).toBe(200)
  await expect(page.getByRole('button', { name: /^save/i })).toHaveCount(0)
  const staffContext = await browser.newContext()
  const staff = await staffContext.newPage()
  await signInAs(staff, 'staff1')
  for (const route of [...SETTINGS_ROUTES, ...OWNER_ONLY_ROUTES, '/settings/general']) {
    expect((await staff.goto(route))?.status(), route).toBe(404)
  }
  await staffContext.close()
})

async function seesVendorMark(page: Page, route: string): Promise<boolean> {
  await page.goto(route, { waitUntil: 'networkidle' })
  const text = await page.locator('body').innerText()
  return /payload cms|powered by payload|made with payload/i.test(text)
}

test('the sign-in page and app shell show the workspace brand and no platform marks', async ({ page }) => {
  expect(await seesVendorMark(page, '/login')).toBe(false)
  await expect(page.locator('link[rel~="icon"]').first()).toHaveAttribute('href', /.+/)
  await signInAs(page, 'owner')
  expect(await seesVendorMark(page, '/')).toBe(false)
  expect(await seesVendorMark(page, '/settings/branding')).toBe(false)
  // The tab title carries the workspace name on every screen size; the sidebar shows it too on larger screens.
  await expect(page).toHaveTitle(/Demo Agency/)
})

const MAIL_MODULE = 'Mail module'

async function saveModules(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save modules' }).click()
  await expect(page.getByRole('status').or(page.getByText(/saved/i)).first()).toBeVisible({ timeout: 30_000 })
  // The page refreshes after a save; wait for that so the next navigation is not cut short.
  await page.waitForLoadState('networkidle')
}

test('turning the mail module off removes the inbox and turning it back on restores it', async ({ page }) => {
  test.setTimeout(90_000)
  await signInAs(page, 'owner')
  await page.goto('/settings/modules', { waitUntil: 'networkidle' })
  await page.getByRole('checkbox', { name: MAIL_MODULE }).uncheck()
  await saveModules(page)
  try {
    await page.goto('/settings/modules', { waitUntil: 'networkidle' })
    await expect(page.getByRole('checkbox', { name: MAIL_MODULE })).not.toBeChecked()
    await expect(page.locator('[data-slot="sidebar"] a[href="/inbox"]')).toHaveCount(0)
  } finally {
    await page.getByRole('checkbox', { name: MAIL_MODULE }).check()
    await saveModules(page)
  }
  await page.goto('/', { waitUntil: 'networkidle' })
  // The phone drawer is not on the page until opened, so there the inbox page itself is the check.
  if ((page.viewportSize()?.width ?? 0) > 650) {
    await expect(page.locator('[data-slot="sidebar"] a[href="/inbox"]')).toHaveCount(1)
  } else expect((await page.goto('/inbox'))?.status()).toBe(200)
})
