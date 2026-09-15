/* eslint-disable max-lines -- route-health intentionally keeps the customer release guard in one deterministic file. */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'
import { WEB_DIR } from '../../../scripts/seed/local-env'

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''
const SIGN_IN_LOCK = join(tmpdir(), 'ops-route-health-sign-in.lock')
const ROUTE_BUDGET_MS = 12_000
const UUID_TEXT = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
const TASK_VIEWS_LABEL = 'Task views'
const TABLE_VIEW_LABEL = 'Table'
const KANBAN_VIEW_LABEL = 'Kanban'
const CALENDAR_VIEW_LABEL = 'Calendar'
const GANTT_VIEW_LABEL = 'Gantt'
const CURRENT_PAGE = 'page'
const ARIA_CURRENT = 'aria-current'
const ROUTES = [
  ['/', 'Dashboard'],
  ['/leads', 'Leads'],
  ['/leads/board', 'Lead board'],
  ['/deals', 'Deals'],
  ['/deals/board', 'Deal board'],
  ['/contacts', 'Contacts'],
  ['/organizations', 'Organizations'],
  ['/projects', 'Projects'],
  ['/tasks', 'Tasks'],
  ['/tasks/board', KANBAN_VIEW_LABEL],
  ['/my-tasks', 'My tasks'],
  ['/calendar', CALENDAR_VIEW_LABEL],
  ['/inbox', 'Inbox'],
  ['/timeline', 'Timeline'],
  ['/reports', 'Figures'],
  ['/settings/general', 'General'],
  ['/settings/profile', 'Profile'],
  ['/settings/branding', 'Branding'],
  ['/settings/terminology', 'Terminology'],
  ['/settings/members', 'Members'],
  ['/settings/notifications', 'Notifications'],
  ['/settings/email', 'Email'],
  ['/settings/intake', 'Intake'],
  ['/settings/groups', 'Groups'],
  ['/settings/workflows', 'Workflows'],
  ['/settings/fields', 'Fields'],
  ['/settings/modules', 'Modules'],
  ['/settings/import', 'Import'],
  ['/onboarding', 'Workspace'],
  ['/leads/new', 'New lead'],
  ['/contacts/new', 'New contact'],
  ['/organizations/new', 'New organization'],
  ['/projects/new', 'New project'],
] as const

test.describe.configure({ mode: 'serial', timeout: 120_000 })

function tryLock(): boolean {
  try {
    mkdirSync(SIGN_IN_LOCK)
    return true
  } catch {
    const age = Date.now() - (statSync(SIGN_IN_LOCK, { throwIfNoEntry: false })?.mtimeMs ?? Date.now())
    if (age > 60_000) rmSync(SIGN_IN_LOCK, { recursive: true, force: true })
    return false
  }
}

async function signIn(page: Page): Promise<void> {
  // eslint-disable-next-line sonarjs/no-fixed-wait-in-tests -- cross-project D1 session lock is filesystem-backed.
  while (!tryLock()) await page.waitForTimeout(100)
  try {
    await page.goto('/login')
    await page.getByLabel('Email').fill(OWNER_EMAIL)
    await page.getByLabel('Password').fill(DEV_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/$/)
  } finally {
    rmSync(SIGN_IN_LOCK, { recursive: true, force: true })
  }
}

async function firstDetailHref(page: Page, prefix: string): Promise<string> {
  const hrefs = await page
    .locator(`a[href^="${prefix}/"]`)
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href): href is string => href !== null),
    )
  const detail = hrefs.find((href) => !href.endsWith('/new') && !href.includes('/board'))
  if (detail === undefined) throw new Error(`no detail link found for ${prefix}`)
  return detail
}

// eslint-disable-next-line max-lines-per-function, max-statements -- one deterministic route-health flow keeps the audit atomic.
test('customer routes load without browser failures and stay within the response budget', async ({ page }) => {
  const consoleIssues: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []
  const badResponses: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error')
      consoleIssues.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('requestfailed', (request) =>
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`),
  )
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname
    if (response.status() >= 500 || (response.status() >= 400 && path.startsWith('/api/'))) {
      badResponses.push(`${String(response.status())} ${response.request().method()} ${path}`)
    }
  })

  await signIn(page)
  const timings: string[] = []
  for (const [route, heading] of ROUTES) {
    const start = Date.now()
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: heading, exact: false }).first()).toBeVisible()
    const elapsed = Date.now() - start
    timings.push(`${route}=${String(elapsed)}ms`)
    expect(elapsed, `${route} exceeded ${String(ROUTE_BUDGET_MS)}ms`).toBeLessThan(ROUTE_BUDGET_MS)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Application error')
    expect(bodyText, `${route} leaked an internal identifier`).not.toMatch(UUID_TEXT)
  }

  const detailRoutes: string[] = []
  for (const prefix of ['/projects', '/leads', '/deals', '/contacts', '/organizations']) {
    await page.goto(prefix, { waitUntil: 'domcontentloaded' })
    detailRoutes.push(await firstDetailHref(page, prefix))
  }
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('a[href="/my-tasks"]').filter({ hasText: 'My open tasks' })).toHaveCount(1)
  await expect(page.locator('a[href="/leads"]').filter({ hasText: 'Open leads' })).toHaveCount(1)
  await expect(page.locator('a[href="/deals"]').filter({ hasText: 'Open deals' })).toHaveCount(1)
  await expect(page.locator('a[href="/leads/new"]').filter({ hasText: 'New lead' })).toHaveCount(1)
  const taskDetail = await page.locator('a[href^="/tasks/"]').first().getAttribute('href')
  if (taskDetail === null) throw new Error('no task detail link found on dashboard')
  detailRoutes.splice(1, 0, taskDetail)
  await page.goto('/tasks', { waitUntil: 'domcontentloaded' })
  const taskViews = page.getByRole('navigation', { name: TASK_VIEWS_LABEL })
  await expect(taskViews.getByRole('link', { name: TABLE_VIEW_LABEL, exact: true })).toHaveAttribute(
    ARIA_CURRENT,
    CURRENT_PAGE,
  )
  await expect(taskViews.getByRole('link', { name: KANBAN_VIEW_LABEL, exact: true })).toHaveAttribute(
    'href',
    '/tasks/board',
  )
  await expect(taskViews.getByRole('link', { name: CALENDAR_VIEW_LABEL, exact: true })).toHaveAttribute(
    'href',
    '/calendar',
  )
  await expect(taskViews.getByRole('link', { name: GANTT_VIEW_LABEL, exact: true })).toHaveAttribute(
    'href',
    '/timeline',
  )
  await page.goto('/tasks/board', { waitUntil: 'domcontentloaded' })
  await expect(
    page
      .getByRole('navigation', { name: TASK_VIEWS_LABEL })
      .getByRole('link', { name: KANBAN_VIEW_LABEL, exact: true }),
  ).toHaveAttribute(ARIA_CURRENT, CURRENT_PAGE)
  await expect(page.locator('a[href^="/tasks/"]').first()).toBeVisible()
  await page.goto('/timeline', { waitUntil: 'domcontentloaded' })
  await expect(
    page.getByRole('navigation', { name: TASK_VIEWS_LABEL }).getByRole('link', { name: GANTT_VIEW_LABEL, exact: true }),
  ).toHaveAttribute(ARIA_CURRENT, CURRENT_PAGE)
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
  await expect(
    page
      .getByRole('navigation', { name: TASK_VIEWS_LABEL })
      .getByRole('link', { name: CALENDAR_VIEW_LABEL, exact: true }),
  ).toHaveAttribute(ARIA_CURRENT, CURRENT_PAGE)
  await page.goto('/reports', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Figures', exact: true })).toBeVisible()
  await expect(page.getByLabel('Date range')).toHaveValue('30d')
  await expect(page.getByRole('button', { name: 'Apply range', exact: true })).toBeVisible()
  for (const route of detailRoutes) {
    const start = Date.now()
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main, [data-slot="sheet-content"], [data-slot="card"]').first()).toBeVisible()
    expect(Date.now() - start, `${route} exceeded ${String(ROUTE_BUDGET_MS)}ms`).toBeLessThan(ROUTE_BUDGET_MS)
    expect(await page.locator('body').innerText(), `${route} leaked an internal identifier`).not.toMatch(UUID_TEXT)
    if (route.startsWith('/leads/') || route.startsWith('/contacts/') || route.startsWith('/organizations/')) {
      await page.getByRole('tab', { name: 'Email' }).click()
      await expect(page.getByRole('heading', { name: 'Email', exact: true })).toBeVisible()
      await page.getByRole('tab', { name: 'Tasks' }).click()
      await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible()
      await page.getByRole('tab', { name: 'Files' }).click()
      await expect(page.getByRole('heading', { name: 'Files', exact: true })).toBeVisible()
    }
  }

  await page.goto('/leads', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Search workspace' }).click()
  await page.getByPlaceholder('Search people, deals, projects, tasks…').fill('Website')
  await expect(page.getByText('Website redesign inquiry', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  expect(pageErrors, pageErrors.join('\n')).toEqual([])
  expect(failedRequests, failedRequests.join('\n')).toEqual([])
  expect(badResponses, badResponses.join('\n')).toEqual([])
  expect(consoleIssues, consoleIssues.join('\n')).toEqual([])
  test.info().annotations.push({ type: 'route-timings', description: timings.join(', ') })
})

// eslint-disable-next-line max-statements -- this guard intentionally covers both contextual and canonical navigation.
test('task details preserve origin in contextual mode and render canonically when deep-linked', async ({ page }) => {
  await signIn(page)
  await page.goto('/')
  const href = await page.locator('a[href^="/tasks/"]').first().getAttribute('href')
  if (href === null) throw new Error('no task detail link found on dashboard')
  await page.goto(href)
  await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('task-panel.png'), fullPage: true })
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await page.goForward()
  await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/\/$/)
  const taskPath = href.split('?')[0]
  await page.goto(taskPath)
  await expect(page.getByRole('heading', { name: 'Assignees' })).toBeVisible()
  await expect(page.locator('[data-slot="sheet-content"]')).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath('task-page.png'), fullPage: true })
})

test('settings IA and command palette expose useful, non-dead defaults', async ({ page }) => {
  await signIn(page)
  await page.goto('/settings/general')
  const settingsNav = page.getByRole('navigation', { name: 'Settings' })
  await expect(settingsNav.getByRole('heading', { name: 'Workspace' })).toBeVisible()
  await expect(settingsNav.getByRole('heading', { name: 'People & access' })).toBeVisible()
  await expect(settingsNav.getByRole('heading', { name: 'Work configuration' })).toBeVisible()
  await page.getByRole('button', { name: 'Search workspace' }).click()
  await expect(page.getByText('Navigate', { exact: true })).toBeVisible()
  await expect(page.getByText('Create', { exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Navigate' }).getByText('Tasks', { exact: true })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('command-palette.png'), fullPage: true })
  await page.keyboard.press('Escape')
})

// eslint-disable-next-line max-statements -- this guard covers the settings surfaces that must stay actionable.
test('configuration surfaces expose real controls and import starters', async ({ page }) => {
  await signIn(page)
  await page.goto('/settings/modules')
  await expect(page.getByRole('heading', { name: 'Modules', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'CRM module' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Mail module' })).toBeVisible()
  await page.goto('/settings/import')
  await expect(page.getByRole('heading', { name: 'Import', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lead template' })).toHaveAttribute(
    'href',
    '/api/v1/import/template/lead',
  )
  await page.goto('/settings/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Assigned to you in-app' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Assigned to you email' })).toBeVisible()
  await page.goto('/settings/members')
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
  const editAccess = page.locator('summary:visible', { hasText: 'Edit access' }).first()
  await expect(editAccess).toBeVisible()
  await editAccess.click()
  await expect(page.getByRole('button', { name: 'Save access', exact: true }).first()).toBeVisible()
})

test('workspace settings reopen with tenant values intact', async ({ page }) => {
  await signIn(page)
  await page.goto('/settings/profile')
  await expect(page.getByLabel('Name')).toHaveValue('Vivek Thapar')
  await expect(page.getByRole('heading', { name: 'Change password', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Change password', exact: true })).toBeVisible()
  await page.goto('/settings/branding')
  await expect(page.getByLabel('Corner radius')).toHaveValue('md')
  await page.goto('/settings/general')
  await expect(page.getByLabel('Workspace name')).toHaveValue('Mirch Media')
})

// eslint-disable-next-line max-statements -- this guard covers the full saved-view lifecycle in one browser flow.
test('saved views use typed controls and support rename and deletion', async ({ page }) => {
  await signIn(page)
  await page.goto('/settings/views')
  await expect(page.getByRole('heading', { name: 'Views', exact: true })).toBeVisible()
  await expect(page.getByLabel('Record type')).toHaveValue('task')
  await expect(page.getByLabel('View kind')).toHaveValue('table')
  const name = `E2E view ${String(Date.now())}`
  await page.getByLabel('View name').fill(name)
  await page.getByRole('button', { name: 'Save view' }).click()
  await expect(page.getByText(name, { exact: true })).toBeVisible()
  const row = page.getByRole('listitem').filter({ hasText: name })
  await row.getByRole('button', { name: 'Pin', exact: true }).click()
  await expect(row.getByText('Pinned', { exact: true })).toBeVisible()
  await row.getByRole('button', { name: 'Set default', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Default', exact: true })).toBeDisabled()
  const renamed = `${name} renamed`
  await row.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Saved view name').fill(renamed)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText(renamed, { exact: true })).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('listitem').filter({ hasText: renamed }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText(renamed, { exact: true })).toHaveCount(0)
})

test('onboarding exposes the tenant-neutral business preset catalog', async ({ page }) => {
  await signIn(page)
  await page.goto('/onboarding')
  await page.getByRole('button', { name: 'Business type' }).click()
  const preset = page.locator('#business-type option')
  await expect(preset).toHaveCount(9)
  await expect(preset).toContainText(['General business', 'Healthcare', 'Legal', 'Real estate'])
  expect(await preset.allTextContents()).not.toContain('Mirch Media')
})

// Keep the seed source as the single credential authority; this guard catches stale test fixtures.
test('route-health harness has a local owner credential', () => {
  expect(OWNER_EMAIL).toBe('mirchads@gmail.com')
  expect(existsSync(join(WEB_DIR, '.dev.vars.example'))).toBe(true)
  expect(readFileSync(join(WEB_DIR, '.dev.vars.example'), 'utf8')).toContain('PAYLOAD_SECRET=')
})

test('customer surfaces default to light mode under a dark operating-system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
})
