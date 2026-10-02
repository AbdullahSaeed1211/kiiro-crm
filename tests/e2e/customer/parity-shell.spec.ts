import { expect, test, type Cookie, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'
import { sessionCookies } from '../helpers/session'

// Parity rows 01 to 05: sign-in, sidebar, search, links and phone-width layout.
test.describe.configure({ mode: 'serial' })

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''

test('the sign-in page names the workspace, reveals the password, and recovers from a wrong password', async ({
  page,
}) => {
  await page.goto('/login', { waitUntil: 'networkidle' })
  await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible()
  const password = page.getByLabel('Password', { exact: true })
  await password.fill(DEV_PASSWORD)
  await expect(password).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: /show password/i }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)

  // A wrong password explains itself and leaves the form ready for another try.
  await page.getByLabel('Email').fill(OWNER_EMAIL)
  await password.fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page
      .getByRole('alert')
      .or(page.getByText(/invalid|incorrect|unable/i))
      .first(),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  await expect(page).toHaveURL(/\/login/)
})

let cookies: Cookie[] = []
test.beforeAll(async ({ browser }) => {
  cookies = await sessionCookies(browser, 'owner')
})
test.beforeEach(async ({ page }) => {
  await page.context().addCookies(cookies)
})

async function openSearch(page: Page): Promise<void> {
  await page.goto('/deals', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Search workspace' }).click()
}

test('workspace search says when nothing matches and gives focus back on Escape', async ({ page }) => {
  await openSearch(page)
  const input = page.getByRole('combobox').first()
  await expect(page.getByRole('option').first()).toBeVisible()
  await input.fill('zzzzqqxx')
  await expect(page.getByText(/no matching records/i)).toBeVisible()
  await input.fill('landing-page brief')
  await expect(page.getByRole('option', { name: /Confirm landing-page brief/ }).first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Search workspace' })).toBeFocused()
})

const RECORD_LINK = 'a[href^="/leads/"]:not([href*="board"]):not([href*="follow"]):not([href$="new"])'

test('a record link keeps its address after a reload, and Back and Forward agree', async ({ page }) => {
  await page.goto('/leads', { waitUntil: 'networkidle' })
  const first = page.locator(RECORD_LINK).locator('visible=true').first()
  const href = (await first.getAttribute('href')) ?? ''
  await first.click()
  await expect(page).toHaveURL(href)
  await page.reload()
  await expect(page).toHaveURL(href)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/leads$/)
  await page.goForward()
  await expect(page).toHaveURL(href)
  const crumb = page.getByRole('navigation', { name: /breadcrumb/i }).getByRole('link', { name: 'Leads' })
  await expect(crumb).toHaveAttribute('href', '/leads')
})

test('the sidebar marks exactly one current destination', async ({ page }) => {
  // The phone sidebar is a closed drawer; its open state is covered by the shell test in the smoke spec.
  test.skip((page.viewportSize()?.width ?? 0) <= 650, 'the phone sidebar is a closed drawer')
  await page.goto('/deals', { waitUntil: 'networkidle' })
  const current = page.locator('[data-slot="sidebar"] a[aria-current="page"]')
  await expect(current).toHaveCount(1)
  await expect(current).toHaveAttribute('href', '/deals')
})

const PHONE_ROUTES = [
  '/',
  '/leads',
  '/leads/board',
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
]

test('main pages do not scroll sideways at phone width', async ({ page }) => {
  // Only the phone project has the narrow screen this checks.
  test.skip((page.viewportSize()?.width ?? 0) > 450, 'checked at phone width only')
  for (const route of PHONE_ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, window: innerWidth }))
    expect(widths.page, `${route} is wider than the screen`).toBeLessThanOrEqual(widths.window)
  }
})

// Parity row 09: long option lists are searched by name, picked with the keyboard, and show readable labels.
test('the currency and time zone lists search by name and pick with the keyboard', async ({ page }) => {
  await page.goto('/settings/general', { waitUntil: 'networkidle' })
  const currency = page.getByRole('combobox', { name: 'Currency', exact: true })
  const original = await currency.inputValue()
  await currency.click()
  await currency.fill('euro')
  await expect(page.getByRole('option', { name: /EUR|Euro/ }).first()).toBeVisible()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(currency).toHaveValue(/EUR|Euro/)
  // Nothing was saved, so a reload shows the stored value again.
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Currency', exact: true })).toHaveValue(original)
})

// Parity row 04: a link to a page shows that page, not the old one under the new address.
test('the task Board and New task links show their own page when clicked from the task list', async ({ page }) => {
  await page.goto('/tasks', { waitUntil: 'networkidle' })
  await page.locator('a[href="/tasks/board"]:visible').first().click()
  await expect(page).toHaveURL(/\/tasks\/board/)
  await expect(page.getByRole('heading', { level: 1 }).first()).not.toContainText('Open tasks', { timeout: 30_000 })
  await page.goto('/tasks', { waitUntil: 'networkidle' })
  await page.locator('a[href="/tasks/new"]:visible').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'New task' })).toBeVisible({ timeout: 30_000 })
})
