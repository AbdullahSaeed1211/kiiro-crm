import { expect, test, type Browser, type Cookie, type Page } from '@playwright/test'
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

/** Signs in once and returns the session cookies, so a file with many tests does not hit the login rate limit. */
export async function sessionCookies(browser: Browser, key: UserKey): Promise<Cookie[]> {
  const baseURL = test.info().project.use.baseURL
  const context = await browser.newContext(baseURL === undefined ? {} : { baseURL })
  await signInAs(await context.newPage(), key)
  const { cookies } = await context.storageState()
  await context.close()
  return cookies
}
