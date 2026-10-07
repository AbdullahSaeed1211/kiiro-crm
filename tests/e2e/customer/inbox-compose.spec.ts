import { expect, test, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Compose writes to any address; a new address becomes a contact so the message is kept.
async function openCompose(page: Page): Promise<void> {
  await page.goto('/inbox', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Compose' }).first().click()
  await expect(page.getByRole('dialog', { name: 'New message' })).toBeVisible()
}

/** Writes a short message to one address and waits for the dialog to close. */
async function sendTo(page: Page, address: string): Promise<void> {
  await openCompose(page)
  const dialog = page.getByRole('dialog', { name: 'New message' })
  await dialog.getByLabel('To').fill(address)
  await dialog.getByLabel('Subject').fill('Hello')
  await dialog.getByLabel('Message').fill('Testing compose.')
  await dialog.getByRole('button', { name: 'Send' }).click()
  await expect(dialog).toBeHidden({ timeout: 30_000 })
}

async function contactCount(page: Page, address: string): Promise<number> {
  const found = await page.request.get(`/api/v1/contacts?q=${encodeURIComponent(address)}`)
  const body = (await found.json()) as { data: { records: unknown[] } }
  return body.data.records.length
}

test('compose refuses a bad address, then sends to an address that is on no record', async ({ page }) => {
  test.setTimeout(90_000)
  await signInAs(page, 'owner')
  await openCompose(page)
  const dialog = page.getByRole('dialog', { name: 'New message' })
  await dialog.getByRole('button', { name: 'Send' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Add an address')
  await dialog.getByLabel('To').fill('not-an-address')
  await dialog.getByLabel('Subject').fill('Hello')
  await dialog.getByLabel('Message').fill('Testing compose.')
  await dialog.getByRole('button', { name: 'Send' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Check the addresses')
  const address = `compose-${String(Date.now())}@example.test`
  await sendTo(page, address)
  await sendTo(page, address)
  expect(await contactCount(page, address)).toBe(1)
})
