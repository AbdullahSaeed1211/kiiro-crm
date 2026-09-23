import { expect, test, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(OWNER_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('inbox exposes the mail-client layout and keeps compose sending disabled', async ({ page, isMobile }, testInfo) => {
  await signIn(page)
  await page.goto('/inbox')
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Mail folders' })).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Search messages' })).toBeVisible()
  if (!isMobile) await page.screenshot({ path: testInfo.outputPath('inbox-desktop.png'), fullPage: true })

  await page.getByRole('searchbox', { name: 'Search messages' }).fill('no matching conversation')
  await expect(page.getByText('No conversations match your search.')).toBeVisible()

  await page.getByRole('button', { name: 'Compose', exact: true }).filter({ visible: true }).first().click()
  const composer = page.getByRole('dialog', { name: 'New message' })
  await expect(composer).toBeVisible()
  await expect(composer.getByRole('button', { name: 'Send' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(composer).toHaveCount(0)
})
