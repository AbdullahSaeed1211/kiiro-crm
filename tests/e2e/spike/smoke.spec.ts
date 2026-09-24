import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { expect as baseExpect, test, type Page, type Response } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'
import { parseDevVars, WEB_DIR } from '../../../scripts/seed/local-env'
import { verifyTimelineDragPersistence } from './timeline-drag'

// Runs against `pnpm dev` on a database prepared by `pnpm db:reset:local && pnpm seed:dev`.
const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''
const STAFF_ONE_NAME = USERS.find((user) => user.key === 'staff1')?.name ?? ''
const CRON_PATH = '/api/v1/internal/cron'
const CARD = '[data-card-id]'
const DESKTOP_BOARD_TASK = 'Review service-page hierarchy'
const MOBILE_BOARD_TASK = 'Check appointment and contact paths'
const IN_PROGRESS_STAGE = 'In progress'
const TODO_STAGE = 'To do'
const TASK_BOARD_PATH = '/tasks/board'
const TASK_STAGE_SELECTOR = 'section[data-stage-id]'
const ARIA_LABEL_ATTRIBUTE = 'aria-label'
const SIGN_IN_LOCK = join(tmpdir(), 'ops-spike-sign-in.lock')
const LOCK_STALE_MS = 60_000
const LOCK_POLL_MS = 100

// First requests compile pages on `next dev`.
test.describe.configure({ mode: 'serial', timeout: 120_000 })
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
    await page.goto('/login')
    await page.getByLabel('Email').fill(OWNER_EMAIL)
    await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
    const login = page.waitForResponse(isPostTo('/api/v1/auth/login'))
    await page.getByRole('button', { name: 'Sign in' }).click()
    expect((await login).status()).toBe(200)
    await page.waitForURL((url) => url.pathname === '/')
  } finally {
    rmSync(SIGN_IN_LOCK, { recursive: true, force: true })
  }
}

async function expectContained(page: Page, route: string): Promise<void> {
  await page.goto(route)
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }))
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport)
}

async function verifyMobileSidebar(page: Page): Promise<void> {
  const toggle = page.locator('[data-slot="sidebar-trigger"]')
  const mobileSidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]')
  await toggle.click()
  await expect(mobileSidebar).toBeVisible()
  await expect(mobileSidebar.getByRole('link', { name: 'Deals' })).toBeVisible()
  await expect(mobileSidebar.getByRole('link', { name: 'Contacts' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(mobileSidebar).toBeHidden()
}

async function verifyDesktopSidebarCollapse(page: Page): Promise<void> {
  const groupLabels = page.locator('[data-slot="sidebar"] [data-sidebar="group-label"]')
  const toggle = page.locator('[data-slot="sidebar-trigger"]')
  await expect(groupLabels).toHaveCount(2)
  await toggle.click()
  await expect(groupLabels.first()).toBeHidden()
  await expect(groupLabels.last()).toBeHidden()
  await page.reload()
  await expect(groupLabels.first()).toBeHidden()
  await expect(groupLabels.last()).toBeHidden()
  await toggle.click()
  await expect(groupLabels.first()).toBeVisible()
  await expect(groupLabels.last()).toBeVisible()
}

async function verifySidebarCollapse(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 0) <= 650) return verifyMobileSidebar(page)
  return verifyDesktopSidebarCollapse(page)
}

test('customer shell uses the custom login, workspace tools, and contained responsive layouts', async ({ page }) => {
  await page.goto('/tasks')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()

  await signIn(page)
  await expect(page.getByText('Mirch Media', { exact: true })).toHaveCount(1)
  expect(await page.locator('a[href="/projects"]').count()).toBeGreaterThan(0)
  if (page.viewportSize()?.width !== 390)
    expect(await page.locator('a[href="/settings/general"]').count()).toBeGreaterThan(0)
  await expect(page.locator('a[href^="/admin"]')).toHaveCount(0)

  await verifySidebarCollapse(page)

  await page.getByRole('button', { name: 'Search workspace' }).click()
  await page.getByPlaceholder('Search people, deals, projects, tasks…').fill('service-page')
  await expect(page.getByText(DESKTOP_BOARD_TASK, { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  for (const route of ['/', '/leads', '/deals/board', '/settings/general']) await expectContained(page, route)
})

const boardCard = (page: Page, title: string) => page.locator(CARD, { hasText: title })
const boardColumn = (page: Page, stage: string) => page.getByRole('region', { name: stage, exact: true })

interface CardMove {
  readonly title: string
  readonly to: string
}

async function moveCard(page: Page, move: CardMove): Promise<void> {
  const card = boardCard(page, move.title)
  // The explicit menu is available on every viewport; drag-and-drop remains an optional shortcut.
  await card.getByRole('button', { name: 'Move to…' }).click()
  await page.getByRole('menuitem', { name: move.to }).click()
}

async function moveAndVerifyAfterReload(page: Page, move: CardMove): Promise<void> {
  const saved = page.waitForResponse(isPostTo(TASK_BOARD_PATH))
  await moveCard(page, move)
  expect((await saved).ok()).toBe(true)
  await expect(boardColumn(page, move.to).locator(CARD, { hasText: move.title })).toBeVisible()
  await page.reload()
  await expect(boardColumn(page, move.to).locator(CARD, { hasText: move.title })).toBeVisible()
}

async function dragCardOutsideTargetsDoesNotOpen(page: Page, title: string): Promise<void> {
  if ((page.viewportSize()?.width ?? 0) < 768) return
  const card = boardCard(page, title)
  const source = page.locator(TASK_STAGE_SELECTOR, { has: card })
  const sourceName = await source.getAttribute(ARIA_LABEL_ATTRIBUTE)
  const box = await card.boundingBox()
  if (sourceName === null || box === null) throw new Error(`cannot measure task card ${title}`)
  const start = { x: box.x + box.width / 2, y: box.y + Math.min(18, box.height / 2) }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 36, start.y + 18, { steps: 4 })
  await page.mouse.move(280, 40, { steps: 5 })
  await page.mouse.up()
  await expect(page).toHaveURL(TASK_BOARD_PATH)
  await expect(card).toBeVisible()
  await expect(source).toHaveAttribute(ARIA_LABEL_ATTRIBUTE, sourceName)
}

async function selectStageWithKeyboard(page: Page, stage: string): Promise<void> {
  const items = page.getByRole('menuitem')
  const count = await items.count()
  for (let index = 0; index < count; index += 1) {
    const focusedText = await page.evaluate(() => document.activeElement.textContent.trim())
    if (focusedText === stage) {
      await page.keyboard.press('Enter')
      return
    }
    await page.keyboard.press('ArrowDown')
  }
  throw new Error(`keyboard navigation did not focus stage ${stage}`)
}

async function moveAndVerifyAfterReloadWithKeyboard(page: Page, move: CardMove): Promise<void> {
  const saved = page.waitForResponse(isPostTo(TASK_BOARD_PATH))
  const trigger = boardCard(page, move.title).getByRole('button', { name: 'Move to…' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitem', { name: move.to, exact: true })).toBeVisible()
  await selectStageWithKeyboard(page, move.to)
  expect((await saved).ok()).toBe(true)
  await expect(boardColumn(page, move.to).locator(CARD, { hasText: move.title })).toBeVisible()
  await page.reload()
  await expect(boardColumn(page, move.to).locator(CARD, { hasText: move.title })).toBeVisible()
}

test('spike: /tasks shows the task table after sign-in', async ({ page }) => {
  await signIn(page)
  await page.goto('/tasks')
  const table = page.getByRole('table')
  await expect(table.getByRole('columnheader', { name: 'Title' })).toBeVisible()
  await expect(table.locator('tbody tr').first()).toBeVisible()
})

test('spike: /tasks/board move menu persists after a reload', async ({ page, isMobile }) => {
  await signIn(page)
  await page.goto(TASK_BOARD_PATH)
  await expect(boardCard(page, DESKTOP_BOARD_TASK)).toContainText(STAFF_ONE_NAME)
  // Desktop and phone projects run in parallel, so each moves its own card.
  const title = isMobile ? MOBILE_BOARD_TASK : DESKTOP_BOARD_TASK
  await expect(boardCard(page, title)).toBeVisible()
  await dragCardOutsideTargetsDoesNotOpen(page, title)
  const from = await page
    .locator(TASK_STAGE_SELECTOR, { has: boardCard(page, title) })
    .getAttribute(ARIA_LABEL_ATTRIBUTE)
  if (from === null) throw new Error(`no stage for task ${title}`)
  const destination = from === IN_PROGRESS_STAGE ? TODO_STAGE : IN_PROGRESS_STAGE
  await moveAndVerifyAfterReload(page, { title, to: destination })
  await moveAndVerifyAfterReload(page, { title, to: from })
})

test('spike: /tasks/board move menu supports keyboard and persists after a reload', async ({ page, isMobile }) => {
  await signIn(page)
  await page.goto(TASK_BOARD_PATH)
  const title = isMobile ? MOBILE_BOARD_TASK : DESKTOP_BOARD_TASK
  await expect(boardCard(page, title)).toBeVisible()
  const from = await page
    .locator(TASK_STAGE_SELECTOR, { has: boardCard(page, title) })
    .getAttribute(ARIA_LABEL_ATTRIBUTE)
  if (from === null) throw new Error(`no stage for task ${title}`)
  const destination = from === IN_PROGRESS_STAGE ? TODO_STAGE : IN_PROGRESS_STAGE
  await moveAndVerifyAfterReloadWithKeyboard(page, { title, to: destination })
  await moveAndVerifyAfterReloadWithKeyboard(page, { title, to: from })
})

test('spike: /tasks/board rejected move rolls back and explains the failure', async ({ page }) => {
  await signIn(page)
  await page.goto(TASK_BOARD_PATH)
  const title = DESKTOP_BOARD_TASK
  const card = boardCard(page, title)
  await expect(card).toBeVisible()
  const source = page.locator(TASK_STAGE_SELECTOR, { has: card })
  const sourceName = await source.getAttribute(ARIA_LABEL_ATTRIBUTE)
  if (sourceName === null) throw new Error(`no stage for task ${title}`)
  const destination = sourceName === IN_PROGRESS_STAGE ? TODO_STAGE : IN_PROGRESS_STAGE
  await page.route(`**${TASK_BOARD_PATH}`, async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 500, body: 'rejected by test' })
    else await route.continue()
  })
  await moveCard(page, { title, to: destination })
  await expect(page.getByText('Could not move the task', { exact: true })).toBeVisible()
  await expect(source.getByText(title, { exact: true })).toBeVisible()
  await expect(page.locator(TASK_STAGE_SELECTOR, { hasText: title })).toHaveAttribute(ARIA_LABEL_ATTRIBUTE, sourceName)
})

test('spike: /timeline drag persists new dates after a reload', async ({ page }) => {
  await signIn(page)
  await verifyTimelineDragPersistence(page)
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
