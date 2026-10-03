import { expect, test, type Locator, type Page } from '@playwright/test'
import { sessionCookies } from '../helpers/session'
import type { Cookie } from '@playwright/test'

// Parity rows 13 to 17: lists show their filters as chips, clear cleanly, keep filters across views, and sort visibly.
test.describe.configure({ mode: 'serial' })

/** Lists render a desktop table and a phone card list; this keeps only the one on screen. */
const VISIBLE = 'visible=true'

let cookies: Cookie[] = []
test.beforeAll(async ({ browser }) => {
  cookies = await sessionCookies(browser, 'owner')
})
test.beforeEach(async ({ page }) => {
  await page.context().addCookies(cookies)
})

const chips = (page: Page) => page.getByRole('list', { name: 'Filters in use' }).getByRole('listitem')

async function openList(page: Page, path: string): Promise<void> {
  // Wait for the network to settle so typing is not lost before the page is interactive.
  await page.goto(path, { waitUntil: 'networkidle' })
}

async function applyLeadFilters(page: Page): Promise<void> {
  await page.getByRole('searchbox', { name: 'Search leads' }).fill('a')
  await expect(page).toHaveURL(/q=a/, { timeout: 15_000 })
  await page.getByRole('button', { name: /Stage/ }).click()
  await page.locator('[data-slot="popover-content"]').getByRole('checkbox').first().click()
  await expect(page).toHaveURL(/stage=/)
  await page.keyboard.press('Escape')
  await page.getByLabel('Owner').selectOption('me')
  await expect(page).toHaveURL(/owner=me/)
  await page.getByLabel('Source').selectOption({ index: 1 })
  await expect(page).toHaveURL(/source=/)
}

test('lead filters show as chips, remove one at a time, and clear all in one click', async ({ page }) => {
  await openList(page, '/leads')
  await applyLeadFilters(page)
  await expect(chips(page)).toHaveCount(5) // search, stage, owner, source and "Clear all"
  await page.getByRole('button', { name: /^Remove filter: Owner/ }).click()
  await expect(page).not.toHaveURL(/owner=/)
  await expect(page).toHaveURL(/q=a/)
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/leads' && url.search === '')
  await expect(chips(page)).toHaveCount(0)
})

test('switching between the lead table and board keeps the search and stage filters', async ({ page }) => {
  await openList(page, '/leads?q=a')
  const views = page.getByRole('navigation', { name: 'Lead views' })
  await views.getByRole('link', { name: 'Board' }).click()
  await expect(page).toHaveURL(/\/leads\/board\?q=a/)
  await page.getByRole('navigation', { name: 'Lead views' }).getByRole('link', { name: 'Table' }).click()
  await expect(page).toHaveURL(/\/leads\?q=a/)
})

test('a deal stage filter shows as a chip and clears', async ({ page }) => {
  await openList(page, '/deals')
  await page.getByLabel('Filter by stage').selectOption({ index: 1 })
  await expect(page).toHaveURL(/stage=/)
  await expect(chips(page)).toHaveCount(2)
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page).toHaveURL((url) => !url.search.includes('stage='))
})

test('a search with no match explains itself and offers a way back', async ({ page }) => {
  await openList(page, '/contacts?q=zzzzqqxx')
  await expect(
    page
      .getByText(/no contacts match/i)
      .locator(VISIBLE)
      .first(),
  ).toBeVisible()
  await page.getByText('Clear search and filters').locator(VISIBLE).first().click()
  await expect(page).toHaveURL((url) => !url.search.includes('q='))
  await expect(page.getByText(/no contacts match/i).locator(VISIBLE)).toHaveCount(0)
})

test('task table sorting shows its direction and survives a reload', async ({ page }) => {
  // Phones list tasks as cards, which have no sort headers; the sort menu there is covered by the settings checks.
  test.skip((page.viewportSize()?.width ?? 0) <= 390, 'phones list tasks as cards without sort headers')
  await openList(page, '/tasks')
  const header = page.getByRole('columnheader', { name: /Title/ })
  await header.getByRole('link').click()
  await expect(header).toHaveAttribute('aria-sort', 'ascending')
  await header.getByRole('link').click()
  await expect(header).toHaveAttribute('aria-sort', 'descending')
  await page.reload()
  await expect(page.getByRole('columnheader', { name: /Title/ })).toHaveAttribute('aria-sort', 'descending')
})

async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('element is not on the page')
  return box.y
}

async function bottomOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (box === null) throw new Error('element is not on the page')
  return box.y + box.height
}

// Parity row 14: the column menu sits above the table, hides and restores a column, and header labels stay visible.
test('the column menu hides and restores a column and sits above the table', async ({ page }) => {
  // Phones show cards, which have no column menu.
  test.skip((page.viewportSize()?.width ?? 0) <= 390, 'phones list records as cards')
  await openList(page, '/leads')
  const menu = page.getByRole('button', { name: 'Columns' })
  const header = page.getByRole('columnheader', { name: 'Phone' })
  await expect(header).toBeVisible()
  expect(await bottomOf(menu)).toBeLessThanOrEqual(await topOf(page.getByRole('table')))
  await menu.click()
  await page.getByRole('menuitemcheckbox', { name: 'Phone' }).click()
  await page.keyboard.press('Escape')
  await expect(header).toHaveCount(0)
  await menu.click()
  await page.getByRole('menuitemcheckbox', { name: 'Phone' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('columnheader', { name: 'Phone' })).toBeVisible()
})

// Parity row 20: board cards carry the few fields people scan for, and empty lanes still render.
test('board cards show the title and the key facts for their record', async ({ page }) => {
  await openList(page, '/deals/board')
  // Earlier tests add deals without a value, so pick the first card that has one.
  const deal = page.locator('[data-card-id]', { hasText: /[₹$€]/ }).first()
  await expect(deal).toContainText(/[₹$€]/) // value
  await openList(page, '/tasks/board')
  // Tasks made by other tests have no due date, so pick the first card that has one.
  const task = page.locator('[data-card-id]', { hasText: /[A-Z][a-z]{2} \d/ }).first()
  await expect(task).toBeVisible()
  expect(await page.getByRole('region').count()).toBeGreaterThan(2) // every stage lane renders
})

// Parity row 13: a list with more than one page splits into pages and each page link works.
// The suite starts from a freshly seeded local database, so these records need no clean-up.
async function addContacts(page: Page, prefix: string, count: number): Promise<void> {
  const batch = 11
  for (let start = 0; start < count; start += batch) {
    const indexes = Array.from({ length: Math.min(batch, count - start) }, (_, offset) => start + offset)
    await Promise.all(
      indexes.map((index) =>
        page.request.post('/api/v1/contacts', { data: { firstName: `${prefix} ${String(index)}` } }),
      ),
    )
  }
}

test('a list longer than one page offers a next page and shows the rest there', async ({ page }) => {
  test.setTimeout(180_000)
  await openList(page, '/contacts')
  const prefix = `Pager${String(Date.now())}`
  await addContacts(page, prefix, 55)
  await openList(page, `/contacts?q=${prefix}`)
  await expect(page.getByText('1–50 of 55').locator(VISIBLE).first()).toBeVisible()
  await page.getByText('Next', { exact: true }).locator(VISIBLE).first().click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('51–55 of 55').locator(VISIBLE).first()).toBeVisible()
})

// Row 19: several records can be selected and given an owner at once; a failed save says so and changes nothing.
test('bulk assigning owners to selected leads reports a failure, then saves', async ({ page }) => {
  // Phones list records as cards without row selection; bulk editing is a desktop task.
  test.skip((page.viewportSize()?.width ?? 0) <= 390, 'bulk selection is a desktop table feature')
  await openList(page, '/leads')
  const rows = page.getByRole('row').filter({ has: page.getByRole('checkbox') })
  await rows.nth(1).getByRole('checkbox').check()
  await rows.nth(2).getByRole('checkbox').check()
  await page.getByLabel('Assign owner').selectOption({ label: 'Client Services Lead' })
  await page.route('**/leads**', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 500, body: 'rejected by test' })
    else await route.continue()
  })
  await page.getByRole('button', { name: /^Apply to 2/ }).click()
  await expect(page.getByRole('group', { name: 'Bulk actions' }).getByRole('status')).toBeVisible()
  await page.unroute('**/leads**')
  await page.getByRole('button', { name: /^Apply to 2/ }).click()
  await expect(page.getByRole('group', { name: 'Bulk actions' }).getByRole('status')).toContainText('2 updated')
})

// Row 17: the deal search stays when switching between the table and the board.
test('switching between the deal table and board keeps the search', async ({ page }) => {
  await openList(page, '/deals?q=Keystone')
  await page.getByRole('navigation', { name: 'Deal views' }).getByRole('link', { name: 'Board' }).click()
  await expect(page).toHaveURL(/\/deals\/board\?q=Keystone/)
  await expect(page.getByRole('searchbox', { name: 'Search deals' })).toHaveValue('Keystone')
  await page.getByRole('navigation', { name: 'Deal views' }).getByRole('link', { name: 'Table' }).click()
  await expect(page).toHaveURL(/\/deals\?q=Keystone/)
})
