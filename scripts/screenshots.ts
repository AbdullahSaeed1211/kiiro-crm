import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, devices, type BrowserContext, type Page } from '@playwright/test'
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

/** The first task whose page lists logged time, so the detail screenshot shows a full task. */
async function taskWithTime(page: Page): Promise<string> {
  const response = await page.request.get(`${BASE}/api/v1/tasks?limit=40`)
  const body = (await response.json()) as { data: { records?: { id: string }[] } | { id: string }[] }
  const records = Array.isArray(body.data) ? body.data : (body.data.records ?? [])
  for (const task of records) {
    await page.goto(`${BASE}/tasks/${task.id}`, { waitUntil: 'load' })
    await page.waitForTimeout(800)
    if ((await page.locator('section[aria-label="Time"] li').count()) > 0) return task.id
  }
  throw new Error('no task with logged time; run pnpm seed:demo first')
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
    { route: '/leads/board', name: 'leads-board' },
    { route: '/deals/board', name: 'deals-board' },
    { route: '/tasks/board', name: 'tasks-board' },
    { route: '/reports?range=90d', name: 'figures' },
    { route: '/settings/members', name: 'settings' },
  ]) {
    await shoot(desktop, shot)
  }
  await shoot(desktop, { route: `/tasks/${await taskWithTime(desktop)}`, name: 'task-detail' })
  const phone = await signIn(await browser.newContext({ ...devices['iPhone 13'] }))
  await shoot(phone, { route: '/', name: 'mobile-dashboard' })
  await shoot(phone, { route: '/leads', name: 'mobile-leads' })
  await browser.close()
  return 0
}

if (isMain(import.meta.url)) runCli(main)
