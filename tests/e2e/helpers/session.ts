import { expect, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

type UserKey = (typeof USERS)[number]['key']

/** Signs in as one of the seeded people and waits for the home page. */
export async function signInAs(page: Page, key: UserKey): Promise<void> {
  const email = USERS.find((user) => user.key === key)?.email ?? ''
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 60_000 })
}
