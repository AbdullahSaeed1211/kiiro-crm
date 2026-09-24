import { expect, test, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''
const SAVE_ERROR = "We couldn't save your changes. Please try again."

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(OWNER_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('settings save stays retryable after a request failure', async ({ page }) => {
  await signIn(page)
  await page.goto('/settings/general')

  let interceptedAction = false
  await page.route('**/settings/general', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    interceptedAction = true
    return route.abort('failed')
  })

  const saveButton = page.getByRole('button', { name: 'Save changes' })
  await saveButton.click()
  await expect(page.getByText(SAVE_ERROR, { exact: true })).toBeVisible()
  await expect(saveButton).toBeEnabled()
  expect(interceptedAction).toBe(true)
})
