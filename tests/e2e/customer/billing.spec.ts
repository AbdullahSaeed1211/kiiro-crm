import { expect, test, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Quotes and invoices: a quote is made, sent and accepted, becomes an invoice, and staff cannot see any of it.
/** A saved document's page; `new` and the list do not match. */
const SAVED_URL = /\/billing\/(?!new)[^/?]+$/

test.describe.configure({ mode: 'serial' })

/** Clicks one action button and waits for the next one to show. */
async function advance(page: Page, step: { from: string; to: string }): Promise<void> {
  await page.getByRole('button', { name: step.from }).click()
  await expect(page.getByRole('button', { name: step.to })).toBeVisible({ timeout: 30_000 })
}

async function startDocument(page: Page, kind: 'quote' | 'invoice', price: string): Promise<void> {
  await page.goto(`/billing/new?kind=${kind}`, { waitUntil: 'networkidle' })
  await page.locator('#billing-company').selectOption({ index: 1 })
  await page.getByLabel('Item').fill('Brand design')
  await page.getByLabel('Price', { exact: true }).fill(price)
}

test('a quote becomes an invoice and the totals follow the items', async ({ page }) => {
  test.setTimeout(120_000)
  await signInAs(page, 'owner')
  await startDocument(page, 'quote', '100')
  await page.getByLabel('Quantity').fill('1.5')
  await page.getByLabel('Tax %').fill('18')
  await expect(page.getByText('Total:')).toContainText('177.00')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(SAVED_URL, { timeout: 30_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('QUO-')

  await advance(page, { from: 'Mark as sent', to: 'Mark as accepted' })
  await page.getByRole('button', { name: 'Mark as accepted' }).click()
  await page.getByRole('button', { name: 'Make an invoice' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('INV-', { timeout: 30_000 })
  await expect(page.getByText(/Made from QUO-/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as sent' })).toBeVisible()
})

test('a bad price is refused and a sent document cannot be edited', async ({ page }) => {
  test.setTimeout(90_000)
  await signInAs(page, 'owner')
  await startDocument(page, 'invoice', 'abc')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('The document was not saved.')).toBeVisible()
  await page.getByLabel('Price', { exact: true }).fill('50')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page).toHaveURL(SAVED_URL, { timeout: 30_000 })
  const url = page.url()
  await advance(page, { from: 'Mark as sent', to: 'Mark as paid' })
  await page.goto(`${url}/edit`)
  await expect(page).toHaveURL(url)
  await page.goto('/billing?kind=invoice', { waitUntil: 'networkidle' })
  await expect(page.getByRole('link', { name: /INV-/ }).first()).toBeVisible()
})

test('staff cannot open billing or call its API', async ({ page }) => {
  await signInAs(page, 'staff1')
  expect((await page.goto('/billing'))?.status()).toBe(404)
  expect((await page.request.get('/api/v1/billing')).status()).toBe(403)
  expect((await page.request.post('/api/v1/billing', { data: { kind: 'quote' } })).status()).toBeGreaterThanOrEqual(400)
})
