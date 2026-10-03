import { expect, test, type Cookie, type Page } from '@playwright/test'
import { sessionCookies, signInAs } from '../helpers/session'

// The Activity page: filters, paging, CSV export, and who may open it.
test.describe.configure({ mode: 'serial' })

let cookies: Cookie[] = []
test.beforeAll(async ({ browser }) => {
  cookies = await sessionCookies(browser, 'owner')
})
test.beforeEach(async ({ page }) => {
  await page.context().addCookies(cookies)
})

const LOG = '/settings/activity'

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

test('the log filters by record type, pages, and exports the same filter as CSV', async ({ page }) => {
  test.setTimeout(150_000)
  await addContacts(page, `Audit${String(Date.now())}`, 55)
  await page.goto(`${LOG}?type=contact`, { waitUntil: 'networkidle' })
  const rows = page.getByRole('listitem').filter({ hasText: 'Created' })
  await expect(rows).toHaveCount(50)
  await expect(page.getByText(/^1-50 of \d+/)).toBeVisible()
  // Every row on a contact-only filter links to a contact.
  await expect(page.locator('a[href^="/contacts/"]')).toHaveCount(50)
  await page.getByRole('link', { name: 'Next' }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText(/^51-/)).toBeVisible()
  await expectCsv(page)
})

async function expectCsv(page: Page): Promise<void> {
  const csv = await page.request.get('/api/v1/export/activity?type=contact')
  expect(csv.status()).toBe(200)
  const lines = (await csv.text()).trim().split(/\r?\n/)
  expect(lines[0]).toContain('time')
  expect(lines.length).toBeGreaterThan(50)
  expect(lines.slice(1).every((line) => line.includes('contact'))).toBe(true)
}

test('a filter with no match says so, and Clear brings the list back', async ({ page }) => {
  await page.goto(`${LOG}?from=2001-01-01&to=2001-01-02`, { waitUntil: 'networkidle' })
  await expect(page.getByText('No changes match these filters.')).toBeVisible()
  await page.getByRole('link', { name: 'Clear' }).click()
  await expect(page.getByRole('listitem').first()).toBeVisible()
  await expect(page.getByText('No changes match these filters.')).toHaveCount(0)
})

test('staff cannot open the log or download it', async ({ browser }) => {
  const context = await browser.newContext()
  const staff = await context.newPage()
  await signInAs(staff, 'staff1')
  expect((await staff.goto(LOG))?.status()).toBe(404)
  expect((await staff.request.get('/api/v1/export/activity')).status()).toBe(403)
  await context.close()
})

// The security view lists access, settings, token and download events with the person who did them.
async function inviteSomeone(page: Page, email: string): Promise<void> {
  await page.goto('/settings/members', { waitUntil: 'networkidle' })
  await page.getByLabel('Teammate email').fill(email)
  await page.getByLabel('Member role').selectOption('staff')
  await page.getByRole('button', { name: 'Invite', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Invitation created.' })).toBeVisible({ timeout: 30_000 })
}

test('the security view shows who invited a person and who downloaded data, and filters by event', async ({ page }) => {
  test.setTimeout(120_000)
  const email = `audit-${String(Date.now())}@example.test`
  await inviteSomeone(page, email)
  expect((await page.request.get('/api/v1/export/activity')).status()).toBe(200)
  await page.goto(`${LOG}?log=security`, { waitUntil: 'networkidle' })
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Invited a person' }).filter({ hasText: email }),
  ).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Downloaded data' }).first()).toBeVisible()
  await page.getByLabel('Event').selectOption('member.invited')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page).toHaveURL(/event=member\.invited/)
  await expect(page.getByRole('listitem').filter({ hasText: 'Downloaded data' })).toHaveCount(0)
  const csv = await page.request.get('/api/v1/export/activity?log=security&event=member.invited')
  expect(await csv.text()).toContain(email)
})
