import { expect, test, type Browser, type Cookie, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

type UserKey = (typeof USERS)[number]['key']

/**
 * Sessions already made by this worker. The local app allows 20 sign-ins a minute, which a full run would pass, so a
 * person who signed in once reuses that session; a session the app no longer accepts is replaced by a fresh sign-in.
 */
const sessions = new Map<UserKey, Cookie[]>()

async function reuseSession(page: Page, key: UserKey): Promise<boolean> {
  const saved = sessions.get(key)
  if (saved === undefined) return false
  await page.context().addCookies(saved)
  await page.goto('/')
  if (!page.url().includes('/login')) return true
  sessions.delete(key)
  await page.context().clearCookies()
  return false
}

async function signInWithPassword(page: Page, key: UserKey): Promise<void> {
  const email = USERS.find((user) => user.key === key)?.email ?? ''
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function trySignIn(page: Page, key: UserKey): Promise<boolean> {
  try {
    await signInWithPassword(page, key)
    await expect(page).toHaveURL(/\/$/, { timeout: 30_000 })
    return true
  } catch {
    return false
  }
}

/** Signs in as one of the seeded people and waits for the home page. */
export async function signInAs(page: Page, key: UserKey): Promise<void> {
  if (await reuseSession(page, key)) return
  // Two sign-ins of the same person at once can lose one session on D1, so a lost one is tried again.
  for (let attempt = 1; attempt < 3; attempt += 1) {
    if (await trySignIn(page, key)) break
    await page.waitForTimeout(1500)
  }
  await expect(page).toHaveURL(/\/$/, { timeout: 60_000 })
  sessions.set(key, await page.context().cookies())
}

/** The session cookies of a signed-in person, so a file with many tests signs in once. */
export async function sessionCookies(browser: Browser, key: UserKey): Promise<Cookie[]> {
  const baseURL = test.info().project.use.baseURL
  const context = await browser.newContext(baseURL === undefined ? {} : { baseURL })
  await signInAs(await context.newPage(), key)
  const { cookies } = await context.storageState()
  await context.close()
  return cookies
}

/** Opens a page and waits for it to settle; a save that is still refreshing can cut the first try short, so it retries once. */
export async function gotoSettled(page: Page, path: string): Promise<void> {
  try {
    await page.goto(path, { waitUntil: 'networkidle' })
  } catch {
    await page.goto(path, { waitUntil: 'networkidle' })
  }
}
