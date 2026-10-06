import { expect, test, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Compose writes to any address; a new address becomes a contact so the message is kept.
async function openCompose(page: Page): Promise<void> {
  await page.goto('/inbox', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Compose' }).first().click()
  await expect(page.getByRole('dialog', { name: 'New message' })).toBeVisible()
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
  await dialog.getByLabel('To').fill(`compose-${String(Date.now())}@example.test`)
  await dialog.getByRole('button', { name: 'Send' }).click()
  await expect(dialog).toBeHidden({ timeout: 30_000 })
})
