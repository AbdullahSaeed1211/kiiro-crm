import { expect, test, type Cookie, type Page } from '@playwright/test'
import { sessionCookies } from '../helpers/session'

// Parity rows 10, 27, 28, 30, 32, 33 and 34: records can be edited, related, and followed up from their own page.
test.describe.configure({ mode: 'serial' })

let cookies: Cookie[] = []
test.beforeAll(async ({ browser }) => {
  cookies = await sessionCookies(browser, 'owner')
})
test.beforeEach(async ({ page }) => {
  await page.context().addCookies(cookies)
})

async function createLead(page: Page, title: string): Promise<void> {
  await page.goto('/leads', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Create lead' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('dialog').getByRole('button', { name: 'Create lead' }).click()
  await expect(page).toHaveURL(/\/leads\/[^/]+$/, { timeout: 30_000 })
}

async function editDetails(page: Page, values: Record<string, string>): Promise<void> {
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  for (const [label, value] of Object.entries(values)) await page.getByLabel(label, { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
}

test('a lead rejects a bad email, saves a good edit, and keeps it after a reload', async ({ page }) => {
  await createLead(page, `Parity record ${String(Date.now())}`)
  await editDetails(page, { Email: 'not-an-email' })
  await expect(page.getByRole('alert').first()).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill('ada@parity.test')
  await page.getByLabel('Phone', { exact: true }).fill('+15550123')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('ada@parity.test')).toBeVisible()
  await page.reload()
  await expect(page.getByText('ada@parity.test')).toBeVisible()
  await expect(page.getByText('+15550123')).toBeVisible()
})

async function addNoteAndCheckActivity(page: Page, note: string): Promise<void> {
  await page.getByLabel('Add note').fill(note)
  await page.getByRole('button', { name: 'Comment' }).click()
  await expect(page.getByText(note).first()).toBeVisible()
  await page.getByRole('tab', { name: 'Activity' }).click()
  await expect(page.getByText(note).first()).toBeVisible()
  await expect(page.getByText('Agency Owner').first()).toBeVisible()
}

test('a note shows in the activity list with who wrote it, and a task from the lead is linked back', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const title = `Parity follow ${String(Date.now())}`
  await createLead(page, title)
  const leadUrl = page.url()
  await addNoteAndCheckActivity(page, 'Called and left a message')

  // New task opens with the lead already linked, and the task then shows on the lead's Tasks tab.
  await page.getByRole('button', { name: 'New task' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'New task' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(`Linked to ${title}`)).toBeVisible()
  await page
    .getByRole('button', { name: /create task|save|add task/i })
    .first()
    .click()
  await page.goto(leadUrl, { waitUntil: 'networkidle' })
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await expect(page.getByText(`Follow up with ${title}`)).toBeVisible()
})

async function followAndComeBack(page: Page, dealUrl: string): Promise<void> {
  await page.getByRole('link', { name: 'Court Kings', exact: true }).first().click()
  await expect(page).toHaveURL(/\/organizations\//)
  await page.getByRole('link', { name: 'Booking app for Court Kings' }).locator('visible=true').first().click()
  await expect(page).toHaveURL(dealUrl)
  await page.getByRole('link', { name: 'Tyrone Davis' }).first().click()
  await expect(page).toHaveURL(/\/contacts\//)
  await expect(page.getByRole('link', { name: 'Court Kings', exact: true }).first()).toBeVisible()
}

// Rows 10, 30 and 32: a deal links to its organization and contact, and each page links back to the deal.
test('a deal links to its organization and contact, and expected close saves', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/deals', { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'Booking app for Court Kings' }).locator('visible=true').first().click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Booking app for Court Kings')
  const dealUrl = page.url()

  await page.getByLabel('Expected close').fill('2027-03-15')
  await page.getByRole('button', { name: 'Save date' }).click()
  // The details card shows the saved date once the page refreshes; reload only after that.
  await expect(page.getByText('Mar 15, 2027')).toBeVisible({ timeout: 30_000 })
  await page.reload()
  await expect(page.getByLabel('Expected close')).toHaveValue('2027-03-15')

  await followAndComeBack(page, dealUrl)
})

// Row 11: a file can be attached to a record, shows in its Files tab after a reload, and a failed upload says so.
async function openLeadFiles(page: Page): Promise<void> {
  await page.goto('/leads', { waitUntil: 'networkidle' })
  const link = page.locator('a[href^="/leads/"]:not([href*="board"]):not([href*="follow"]):not([href$="new"])')
  await link.locator('visible=true').first().click()
  await page.getByRole('tab', { name: 'Files' }).click()
}

test('a file can be attached to a lead, a failed upload is reported, and the file is there after a reload', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await openLeadFiles(page)
  const panel = page.getByRole('tabpanel', { name: 'Files' })
  const stamp = String(Date.now())
  const file = { name: `parity-${stamp}.txt`, mimeType: 'text/plain', buffer: Buffer.from('hello') }
  await page.route('**/api/v1/files', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 500, body: 'rejected by test' })
    else await route.continue()
  })
  await panel.locator('input[type=file]').setInputFiles(file)
  await expect(panel.getByRole('status')).toContainText(/unable/i)
  await page.unroute('**/api/v1/files')
  await panel.locator('input[type=file]').setInputFiles(file)
  await expect(panel.getByText(file.name)).toBeVisible({ timeout: 30_000 })
  await page.reload()
  await page.getByRole('tab', { name: 'Files' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Files' }).getByText(file.name)).toBeVisible()
})
