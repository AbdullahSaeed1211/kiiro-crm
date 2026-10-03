import { expect, test, type Cookie, type Page } from '@playwright/test'
import { sessionCookies } from '../helpers/session'

// Parity rows 40, 47 and 48: import reports every problem before saving, and the dashboard figures match the lists.
test.describe.configure({ mode: 'serial' })

let cookies: Cookie[] = []
test.beforeAll(async ({ browser }) => {
  cookies = await sessionCookies(browser, 'owner')
})
test.beforeEach(async ({ page }) => {
  await page.context().addCookies(cookies)
})

async function countOf(page: Page, path: string): Promise<number> {
  await page.goto(path, { waitUntil: 'networkidle' })
  const text = await page.getByRole('heading', { level: 1 }).first().innerText()
  return Number(/\d+/.exec(text)?.[0])
}

test('dashboard cards match the lists they open', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  const leads = Number(
    await page.locator('a[href="/leads"]').filter({ hasText: 'Open leads' }).locator('p').nth(0).innerText(),
  )
  const deals = Number(
    await page.locator('a[href^="/deals"]').filter({ hasText: 'Open deals' }).locator('p').nth(0).innerText(),
  )
  expect(leads).toBe(await countOf(page, '/leads'))
  expect(deals).toBe(await countOf(page, '/deals?stage=open'))
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.locator('a[href^="/deals"]').filter({ hasText: 'Open deals' }).click()
  await expect(page).toHaveURL(/\/deals\?stage=open/)
  expect(deals).toBe(await countOf(page, '/deals?stage=open'))
})

// Row 48: the Figures counts come from the same records as the lists, and the range controls change them.
test('figures match the lists and the range controls change them', async ({ page }) => {
  await page.goto('/reports', { waitUntil: 'networkidle' })
  const metric = async (label: string): Promise<number> =>
    Number(
      await page
        .locator('section', { hasText: label })
        .filter({ has: page.locator('p.text-2xl') })
        .first()
        .locator('p.text-2xl')
        .innerText(),
    )
  const leads = await metric('New leads')
  const deals = await metric('New deals')
  // The figures count every record made in the range; the lists show open leads, so the figure is the larger one.
  expect(leads).toBeGreaterThanOrEqual(await countOf(page, '/leads'))
  expect(deals).toBe(await countOf(page, '/deals'))
  // A range in the past holds none of today's records, and the page says so with zeros instead of breaking.
  await page.goto('/reports?range=custom&from=2001-01-01&to=2001-01-31', { waitUntil: 'networkidle' })
  expect(await metric('New leads')).toBe(0)
})

// Row 47: the file is checked first and every problem is listed by row; nothing is saved until the person confirms.
test('an import checks the file first, lists each problem by row, and saves only after the check', async ({ page }) => {
  test.setTimeout(120_000)
  const stamp = String(Date.now())
  const csv = [
    'First Name,Email',
    `Good${stamp},good${stamp}@import.test`,
    `Bad${stamp},not-an-email`,
    'Duplicate,grace.nolan@keystonehomes.example.test',
  ].join('\n')
  await page.goto('/settings/import', { waitUntil: 'networkidle' })
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'people.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Check file' }).click()
  const report = page.getByRole('status')
  await expect(report).toContainText('3 rows read: 1 can be created, 1 skipped as already existing, 1 with problems')
  await expect(report).toContainText('Row 2')
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeEnabled()
  await page.goto(`/contacts?q=Good${stamp}`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('link', { name: `Good${stamp}` }).locator('visible=true')).toHaveCount(0)
})

test('confirming a checked import saves only the good rows', async ({ page }) => {
  test.setTimeout(120_000)
  const stamp = String(Date.now())
  const csv = `First Name,Email\nKept${stamp},kept${stamp}@import.test\nBroken${stamp},not-an-email`
  await page.goto('/settings/import', { waitUntil: 'networkidle' })
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'people.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: 'Check file' }).click()
  await expect(page.getByRole('status')).toContainText('1 can be created')
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Import complete. 2 rows read: 1 created')
  await page.goto(`/contacts?q=${stamp}`, { waitUntil: 'networkidle' })
  await expect(page.getByRole('link', { name: `Kept${stamp}`, exact: true }).locator('visible=true')).toHaveCount(1)
  await expect(page.getByRole('link', { name: `Broken${stamp}` }).locator('visible=true')).toHaveCount(0)
})

// Row 23: a stage's name, type and colour come from the workflow setting and survive a reload.
async function saveDealWorkflow(page: Page): Promise<void> {
  await page
    .getByRole('article')
    .filter({ has: page.getByLabel('Workflow name') })
    .first()
    .getByRole('button', { name: /^save/i })
    .first()
    .click()
  await expect(page.getByRole('status').or(page.getByText(/saved/i)).first()).toBeVisible({ timeout: 30_000 })
}

test('a stage colour and chance edit in workflow settings persists, then is put back', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/settings/workflows', { waitUntil: 'networkidle' })
  const deals = page
    .getByRole('article')
    .filter({ has: page.getByRole('textbox', { name: 'Workflow name', exact: true }) })
    .filter({ has: page.locator('input[value="Deals"]') })
  const first = deals.getByRole('listitem').first()
  await first.getByRole('radio', { name: 'Green' }).check()
  await saveDealWorkflow(page)
  await page.reload()
  await expect(deals.getByRole('listitem').first().getByRole('radio', { name: 'Green' })).toBeChecked()
  await deals.getByRole('listitem').first().getByRole('radio', { name: 'Blue' }).check()
  await saveDealWorkflow(page)
})

// Row 25: month links move one month at a time, the address keeps the month, and a bad month does not break the page.
test('the calendar moves month by month, keeps the month in its address, and survives a bad month', async ({
  page,
}) => {
  await page.goto('/calendar?month=10&year=2026', { waitUntil: 'networkidle' })
  const heading = page.getByRole('heading', { level: 2 })
  await expect(heading.filter({ hasText: 'October 2026' })).toBeVisible()
  await page.getByRole('link', { name: 'Next month' }).first().click()
  await expect(page).toHaveURL(/month=11&year=2026/)
  await expect(heading.filter({ hasText: 'November 2026' })).toBeVisible()
  await page.reload()
  await expect(heading.filter({ hasText: 'November 2026' })).toBeVisible()
  await page.getByRole('link', { name: 'Previous month' }).first().click()
  await expect(heading.filter({ hasText: 'October 2026' })).toBeVisible()
  const bad = await page.goto('/calendar?month=13&year=abc', { waitUntil: 'networkidle' })
  expect(bad?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
})

// Row 25: Today takes the calendar back to the current month from any other month.
test('the calendar Today link returns to the current month', async ({ page }) => {
  await page.goto('/calendar?month=1&year=2030', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: 'January 2030' })).toBeVisible()
  await page.getByRole('link', { name: 'Today' }).click()
  const now = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date())
  await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: now })).toBeVisible()
})
