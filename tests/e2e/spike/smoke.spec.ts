import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { expect as baseExpect, test, type Page, type Response } from '@playwright/test'
import { DEV_PASSWORD } from '../../../scripts/seed/data'
import { parseDevVars, WEB_DIR } from '../../../scripts/seed/local-env'

// Runs against `pnpm dev` on a database prepared by `pnpm db:reset:local && pnpm seed:dev`.
const OWNER_EMAIL = 'owner@example.test'
const CRON_PATH = '/api/v1/internal/cron'
const CARD = '[data-card-id]'
const BAR = '.wx-bar'
// Week zoom draws one day 44 px wide.
const TWO_DAYS_PX = 88
const SIGN_IN_LOCK = join(tmpdir(), 'ops-spike-sign-in.lock')
const LOCK_STALE_MS = 60_000
const LOCK_POLL_MS = 100

// First requests compile pages on `next dev`.
test.describe.configure({ timeout: 120_000 })
const expect = baseExpect.configure({ timeout: 30_000 })

function devInternalSecret(): string {
  const file = ['.dev.vars', '.dev.vars.example'].map((name) => join(WEB_DIR, name)).find((path) => existsSync(path))
  const secret = file === undefined ? undefined : parseDevVars(readFileSync(file, 'utf8')).get('INTERNAL_SECRET')
  if (secret === undefined) throw new Error('no INTERNAL_SECRET in apps/web/.dev.vars(.example)')
  return secret
}

const isPostTo =
  (path: string) =>
  (response: Response): boolean =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === path

function tryLock(): boolean {
  try {
    mkdirSync(SIGN_IN_LOCK)
    return true
  } catch {
    // A lock left by a crashed run expires.
    const age = Date.now() - (statSync(SIGN_IN_LOCK, { throwIfNoEntry: false })?.mtimeMs ?? Date.now())
    if (age > LOCK_STALE_MS) rmSync(SIGN_IN_LOCK, { recursive: true, force: true })
    return false
  }
}

// Concurrent sign-ins of one user race on D1: Payload rewrites users_sessions, so one login fails with 500 or loses its
// session. Desktop and phone workers therefore sign in one at a time.
async function signIn(page: Page): Promise<void> {
  while (!tryLock()) await delay(LOCK_POLL_MS)
  try {
    await page.goto('/admin/login')
    await page.locator('#field-email').fill(OWNER_EMAIL)
    await page.locator('#field-password').fill(DEV_PASSWORD)
    const login = page.waitForResponse(isPostTo('/api/users/login'))
    await page.locator('button[type="submit"]').click()
    expect((await login).status()).toBe(200)
    await page.waitForURL((url) => !url.pathname.startsWith('/admin/login'))
  } finally {
    rmSync(SIGN_IN_LOCK, { recursive: true, force: true })
  }
}

const boardCard = (page: Page, title: string) => page.locator(CARD, { hasText: title })
const boardColumn = (page: Page, stage: string) => page.getByRole('region', { name: stage, exact: true })

interface CardMove {
  readonly title: string
  readonly to: string
}

async function moveCard(page: Page, move: CardMove, isMobile: boolean): Promise<void> {
  const card = boardCard(page, move.title)
  if (!isMobile) {
    await card.dragTo(boardColumn(page, move.to))
    return
  }
  // Phones have no drag; the card menu is their move path.
  await card.getByRole('button', { name: 'Move to…' }).click()
  await page.getByRole('menuitem', { name: move.to }).click()
}

// Drags left when the bar is near the right edge, so repeated runs keep it on screen.
async function dragBar(page: Page, title: string): Promise<void> {
  const box = await page.locator(BAR, { hasText: title }).boundingBox()
  if (box === null) throw new Error(`no bar for ${title}`)
  const nearRightEdge = box.x + box.width > (page.viewportSize()?.width ?? 0) * 0.8
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + (nearRightEdge ? -TWO_DAYS_PX : TWO_DAYS_PX), y, { steps: 10 })
  await page.mouse.up()
}

test('spike: /tasks shows the task table after sign-in', async ({ page }) => {
  await signIn(page)
  await page.goto('/tasks')
  const table = page.getByRole('table')
  await expect(table.getByRole('columnheader', { name: 'Title' })).toBeVisible()
  await expect(table.locator('tbody tr').first()).toBeVisible()
})

test('spike: /tasks/board move survives a reload', async ({ page, isMobile }) => {
  await signIn(page)
  await page.goto('/tasks/board')
  // Desktop and phone projects run in parallel, so each moves its own card.
  const title = isMobile ? 'Schedule kickoff meeting' : 'Plan launch checklist'
  await expect(boardCard(page, title)).toBeVisible()
  const from = await page.locator('section[data-stage-id]', { has: boardCard(page, title) }).getAttribute('aria-label')
  const move = { title, to: from === 'In progress' ? 'To do' : 'In progress' }
  const saved = page.waitForResponse(isPostTo('/tasks/board'))
  await moveCard(page, move, isMobile)
  expect((await saved).ok()).toBe(true)
  await expect(boardColumn(page, move.to).locator(CARD, { hasText: title })).toBeVisible()
  await page.reload()
  await expect(boardColumn(page, move.to).locator(CARD, { hasText: title })).toBeVisible()
})

test('spike: /timeline drag persists new dates after a reload', async ({ page, isMobile }) => {
  // Skipped on phones only: timeline bars move with a mouse drag and have no touch path.
  test.skip(isMobile, 'Timeline bars move with a mouse drag; the phone project has no drag path.')
  await signIn(page)
  await page.goto('/timeline')
  const title = 'Design style guide'
  const dates = page.locator('.wx-row', { hasText: title }).locator('[data-col-id=":start"], [data-col-id=":end"]')
  await expect(page.locator(BAR, { hasText: title })).toBeVisible()
  const before = await dates.allTextContents()
  const saved = page.waitForResponse(isPostTo('/timeline'))
  await dragBar(page, title)
  expect((await saved).ok()).toBe(true)
  await expect(dates).not.toHaveText(before)
  const after = await dates.allTextContents()
  await page.reload()
  await expect(dates).toHaveText(after)
})

test('spike: internal cron route runs tasks.dueSoon with the dev secret and refuses a wrong one', async ({
  request,
}) => {
  const data = { scheduledTime: Date.now() }
  const accepted = await request.post(CRON_PATH, { headers: { 'x-internal-secret': devInternalSecret() }, data })
  expect(accepted.status()).toBe(200)
  const body = (await accepted.json()) as { readonly ran?: unknown }
  expect(body.ran).toContain('tasks.dueSoon')
  const refused = await request.post(CRON_PATH, { headers: { 'x-internal-secret': 'wrong-secret' }, data })
  expect(refused.status()).toBe(401)
})
