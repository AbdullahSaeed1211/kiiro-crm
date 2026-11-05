import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, devices, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { isMain, runCli } from './lib/report'

const BASE = process.env['SCREENSHOT_BASE_URL'] ?? 'http://localhost:3001'
const OUT = join(process.cwd(), 'docs', 'screenshots')
const SETTLE_MS = 1800
// The dev server's floating indicator is not part of the product.
const HIDE_DEV_UI = 'nextjs-portal, [data-nextjs-dev-tools-button] { display: none !important; }'

async function signIn(context: BrowserContext): Promise<Page> {
  const page = await context.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Email').fill('owner@example.test')
  await page.getByRole('textbox', { name: 'Password' }).fill('local-dev-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
  return page
}

async function shoot(page: Page, input: { readonly route: string; readonly name: string }): Promise<void> {
  await page.goto(`${BASE}${input.route}`, { waitUntil: 'load' })
  await page.addStyleTag({ content: HIDE_DEV_UI })
  await page.waitForTimeout(SETTLE_MS)
  await page.screenshot({ path: join(OUT, `${input.name}.png`) })
  console.log(`screenshots: ${input.name}`)
}

/** The client's Billing tab, with a fresh portal link when it has a contact to share with. */
async function portalLink(page: Page, organizationId: string): Promise<string | undefined> {
  await page.goto(`${BASE}/organizations/${organizationId}?tab=billing`, { waitUntil: 'load' })
  const create = page.getByRole('button', { name: 'Create link' })
  if ((await create.count()) === 0) return undefined
  await create.click()
  const code = page.locator('code').filter({ hasText: '/portal/' }).first()
  await code.waitFor({ timeout: 10_000 }).catch(() => undefined)
  return (await code.textContent())?.trim()
}

/** The portal as the client sees it: a separate context, with no staff session. */
async function shootPortal(browser: Browser, url: string): Promise<void> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.addStyleTag({ content: HIDE_DEV_UI })
  await page.waitForTimeout(SETTLE_MS)
  await page.screenshot({ path: join(OUT, 'portal.png') })
  console.log('screenshots: portal')
  await context.close()
}

/** The client hub, the Billing tab with a fresh link, the portal itself and type settings. */
async function shootClientSurfaces(browser: Browser, desktop: Page): Promise<void> {
  const clientId = await clientWithWork(desktop)
  await shoot(desktop, { route: `/organizations/${clientId}`, name: 'client' })
  const link = await portalLink(desktop, clientId)
  await shoot(desktop, { route: `/organizations/${clientId}?tab=billing`, name: 'portal-card' })
  if (link !== undefined) await shootPortal(browser, link)
  await shoot(desktop, { route: '/settings/sales', name: 'sales-settings' })
}

/** Record ids from a product endpoint, fetched inside the page so the session cookie and CSRF headers apply. */
async function recordsOf(page: Page, path: string): Promise<{ id: string }[]> {
  return page.evaluate(async (url) => {
    const response = await fetch(url)
    const body = (await response.json()) as { data?: { records?: { id: string }[] } | { id: string }[] }
    const data = body.data
    return Array.isArray(data) ? data : (data?.records ?? [])
  }, path)
}

/** The first task whose page lists logged time, so the detail screenshot shows a full task. */
async function taskWithTime(page: Page): Promise<string> {
  for (const task of await recordsOf(page, '/api/v1/tasks?limit=40')) {
    await page.goto(`${BASE}/tasks/${task.id}`, { waitUntil: 'load' })
    await page.waitForTimeout(800)
    if ((await page.locator('section[aria-label="Time"] li').count()) > 0) return task.id
  }
  throw new Error('no task with logged time; run pnpm seed:demo first')
}

/** A client with projects and deals, so the client screenshot shows a full hub. */
async function clientWithWork(page: Page): Promise<string> {
  for (const organization of await recordsOf(page, '/api/v1/organizations?limit=40')) {
    await page.goto(`${BASE}/organizations/${organization.id}`, { waitUntil: 'load' })
    await page.waitForTimeout(500)
    if (
      (await page.locator('a[href^="/projects/"]').count()) > 0 &&
      (await page.locator('a[href^="/deals/"]').count()) > 0
    )
      return organization.id
  }
  throw new Error('no client with a project and a deal; run pnpm seed:demo first')
}

/**
 * Captures the README screenshots from a running app that holds the demo data (`pnpm seed:demo`), signed in as the demo
 * owner. Everything shown is fictional.
 */
export async function main(): Promise<number> {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const desktop = await signIn(await browser.newContext({ viewport: { width: 1440, height: 900 } }))
  for (const shot of [
    { route: '/', name: 'dashboard' },
    { route: '/tasks', name: 'tasks' },
    { route: '/leads/board', name: 'leads-board' },
    { route: '/deals/board', name: 'deals-board' },
    { route: '/tasks/board', name: 'tasks-board' },
    { route: '/reports?range=90d', name: 'figures' },
    { route: '/settings/members', name: 'settings' },
  ]) {
    await shoot(desktop, shot)
  }
  await shootClientSurfaces(browser, desktop)
  await shoot(desktop, { route: `/tasks/${await taskWithTime(desktop)}`, name: 'task-detail' })
  const phone = await signIn(await browser.newContext({ ...devices['iPhone 13'] }))
  await shoot(phone, { route: '/', name: 'mobile-dashboard' })
  await shoot(phone, { route: '/leads', name: 'mobile-leads' })
  await browser.close()
  return 0
}

if (isMain(import.meta.url)) runCli(main)
