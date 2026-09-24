/* eslint-disable max-lines -- route-health intentionally keeps the customer release guard in one deterministic file. */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Locator, type Page, type Response, type Route } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'
import { TASKS } from '../../../scripts/seed/work-data'
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
const CALENDAR_PATH = '/calendar'
const TASK_PATH = '/tasks'
const MEMBERS_PATH = '/settings/members'
const DEAL_TITLE = 'Website redesign engagement'
const DEAL_TARGET_STAGE = 'Proposal sent'
const TASK_PANEL = '[data-slot="sheet-content"]'
const ROUTES = [
  ['/', 'Dashboard'],
  ['/leads', 'Leads'],
  ['/leads/board', 'Lead board'],
  ['/deals', 'Deals'],
  ['/deals/board', 'Deal board'],
  ['/contacts', 'Contacts'],
  ['/organizations', 'Organizations'],
  ['/projects', 'Projects'],
  [TASK_PATH, 'Tasks'],
  ['/tasks/board', KANBAN_VIEW_LABEL],
  ['/my-tasks', 'My tasks'],
  ['/calendar', CALENDAR_VIEW_LABEL],
  ['/inbox', 'Inbox'],
  ['/timeline', GANTT_VIEW_LABEL],
  ['/reports', 'Figures'],
  ['/settings/general', 'General'],
  ['/settings/profile', 'Profile'],
  ['/settings/branding', 'Branding'],
  ['/settings/terminology', 'Terminology'],
  [MEMBERS_PATH, 'Members'],
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
    await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/$/)
  } finally {
    rmSync(SIGN_IN_LOCK, { recursive: true, force: true })
  }
}

async function firstDetailHref(page: Page, prefix: string): Promise<string | undefined> {
  const hrefs = await page
    .locator(`a[href^="${prefix}/"]`)
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href): href is string => href !== null),
    )
  const detail = hrefs.find((href) => !href.endsWith('/new') && !href.includes('/board'))
  return detail
}

async function availableDetailRoutes(page: Page): Promise<string[]> {
  const routes: string[] = []
  for (const prefix of ['/projects', '/leads', '/deals', '/contacts', '/organizations']) {
    await page.goto(prefix, { waitUntil: 'domcontentloaded' })
    const detail = await firstDetailHref(page, prefix)
    if (detail !== undefined) routes.push(detail)
  }
  return routes
}

async function recordedLayoutShiftSince(page: Page, startedAt: number): Promise<number> {
  return page.evaluate((start) => {
    const shifts = performance.getEntriesByType('layout-shift') as (PerformanceEntry & { value?: number })[]
    return shifts.filter((entry) => entry.startTime >= start).reduce((sum, entry) => sum + (entry.value ?? 0), 0)
  }, startedAt)
}

async function expectCalendarPanelOpen(page: Page) {
  await expect(page).toHaveURL(new RegExp(`/tasks/[^?]+\\?panel=1`))
  await expect(page.locator(TASK_PANEL)).toBeVisible()
  await expect(page.locator('section.ops-surface-card')).toBeVisible()
}

async function expectCalendarPanelClosed(page: Page) {
  await expect(page).toHaveURL(new RegExp(`${CALENDAR_PATH}(?:\\?.*)?$`))
  await expect(page.locator(TASK_PANEL)).toHaveCount(0)
  await expect(page.locator('section.ops-surface-card')).toBeVisible()
}

async function taskSourceLink(page: Page, input: Readonly<{ route: string; title: string }>) {
  await page.goto(input.route)
  let taskLink = page.getByRole('link', { name: input.title, exact: true })
  await expect(taskLink).toBeVisible()
  const href = await taskLink.getAttribute('href')
  if (href === null) throw new Error(`task link has no contextual URL for ${input.title}`)
  const sourceUrl = new URL(href, page.url()).searchParams.get('returnTo')
  if (sourceUrl === null) throw new Error(`task link has no return route for ${input.title}`)
  expect(sourceUrl).toContain(input.route)
  const currentUrl = new URL(page.url())
  if (`${currentUrl.pathname}${currentUrl.search}` !== sourceUrl) {
    await page.goto(sourceUrl)
    taskLink = page.getByRole('link', { name: input.title, exact: true })
    await expect(taskLink).toBeVisible()
  }
  return { taskLink, sourceUrl }
}

async function openTaskSourcePanel(
  page: Page,
  input: Readonly<{ taskLink: Locator; title: string; sourceUrl: string }>,
): Promise<void> {
  const openStartedAt = await page.evaluate(() => performance.now())
  await input.taskLink.click()
  await expect(page).toHaveURL(/\/tasks\/[^?]+\?panel=1/)
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(input.sourceUrl)
  await expect(page.getByRole('dialog', { name: input.title })).toBeVisible()
  expect(
    await recordedLayoutShiftSince(page, openStartedAt),
    `opening a task from ${input.sourceUrl} should not shift its source`,
  ).toBe(0)
}

async function closeTaskSourcePanel(page: Page, title: string, sourceUrl: string): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === sourceUrl)
  await expect(page.getByRole('dialog', { name: title })).toHaveCount(0)
  await expect(page.getByRole('link', { name: title, exact: true })).toBeFocused()
}

async function verifyTaskSourcePanel(page: Page, input: Readonly<{ route: string; title: string }>): Promise<void> {
  const { taskLink, sourceUrl } = await taskSourceLink(page, input)
  await openTaskSourcePanel(page, { taskLink, title: input.title, sourceUrl })
  await closeTaskSourcePanel(page, input.title, sourceUrl)
}

async function verifyTaskSourcePanels(
  page: Page,
  sources: readonly Readonly<{ route: string; title: string }>[],
): Promise<void> {
  for (const source of sources) await verifyTaskSourcePanel(page, source)
}

type CalendarTask = Readonly<{ title: string; href: string }>

async function firstCalendarTask(page: Page): Promise<CalendarTask> {
  const link = page.locator('section.ops-surface-card a[href^="/tasks/"][href*="panel=1"]').first()
  await expect(link).toBeVisible()
  const title = await link.innerText()
  const href = await link.getAttribute('href')
  if (title === '' || href === null) throw new Error('calendar task has no contextual URL or title')
  return { title, href }
}

function taskNotificationSource(task: CalendarTask): Readonly<{ taskId: string; returnTo: string }> {
  const href = new URL(task.href, 'http://localhost')
  const id = href.pathname.split('/').at(-1)
  if (id === undefined || id === '') throw new Error('calendar task has no id for its notification')
  const returnTo = href.searchParams.get('returnTo')
  if (returnTo === null) throw new Error('calendar task has no return route for its notification')
  return { taskId: id, returnTo }
}

type TaskNotificationFixture = Readonly<{
  taskId: string
  notificationId: string
  markRead: () => void
  attempts: { count: number }
}>

async function serveNotificationList(route: Route, item: TaskNotificationFixture): Promise<void> {
  await route.fulfill({
    json: {
      notifications: [
        {
          id: item.notificationId,
          type: 'task_due_soon',
          recordType: 'task',
          recordId: item.taskId,
          data: { message: 'Task due soon' },
        },
      ],
    },
  })
}

async function serveNotificationRead(route: Route, item: TaskNotificationFixture): Promise<void> {
  item.attempts.count += 1
  if (item.attempts.count === 1) {
    await route.fulfill({ status: 503, json: { error: 'notification service unavailable' } })
    return
  }
  item.markRead()
  await route.fulfill({ status: 204 })
}

async function serveTaskNotification(route: Route, item: TaskNotificationFixture): Promise<void> {
  const request = route.request()
  const url = new URL(request.url())
  if (request.method() === 'GET' && url.pathname === '/api/v1/notifications/unread-count') {
    await route.fulfill({ json: { count: 1 } })
    return
  }
  if (request.method() === 'GET' && url.pathname === '/api/v1/notifications') {
    await serveNotificationList(route, item)
    return
  }
  if (request.method() === 'PATCH' && url.pathname === `/api/v1/notifications/${item.notificationId}`) {
    await serveNotificationRead(route, item)
    return
  }
  await route.continue()
}

async function openTaskNotificationList(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Notifications' }).click()
  const notifications = page.getByRole('dialog')
  await expect(notifications).toContainText('Task due soon')
  return notifications.getByRole('button', { name: /Task due soon/ })
}

async function expectNotificationReadRetry(page: Page, notification: Locator): Promise<void> {
  await notification.click()
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
    'Could not mark this notification as read. Try again.',
  )
  expect(new URL(page.url()).pathname).toBe(CALENDAR_PATH)
  await expect(notification.locator('span.rounded-full').first()).toHaveClass(/bg-primary/)
}

async function closeNotificationTaskPanel(page: Page, title: string, returnTo: string): Promise<void> {
  await expect(page).toHaveURL(/\/tasks\/[^?]+\?panel=1/)
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(returnTo)
  await expect(page.getByRole('dialog', { name: title })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === returnTo)
  await expect(page.getByRole('dialog', { name: title })).toHaveCount(0)
}

async function verifyNotificationTaskPanel(page: Page, task: CalendarTask): Promise<void> {
  const { taskId, returnTo } = taskNotificationSource(task)
  const notificationId = '11111111-1111-4111-8111-111111111111'
  let markedRead = false
  const attempts = { count: 0 }
  await page.route('**/api/v1/notifications**', (route) =>
    serveTaskNotification(route, { taskId, notificationId, markRead: () => (markedRead = true), attempts }),
  )
  await page.goto(returnTo)
  const notification = await openTaskNotificationList(page)
  await expectNotificationReadRetry(page, notification)
  await notification.click()
  await expect.poll(() => markedRead).toBe(true)
  await closeNotificationTaskPanel(page, task.title, returnTo)
}

async function verifyTaskSourceInteractions(page: Page, task: CalendarTask): Promise<void> {
  await verifyTaskSourcePanels(page, [
    { route: TASK_PATH, title: task.title },
    { route: `${TASK_PATH}/board`, title: task.title },
  ])
  await verifyNotificationTaskPanel(page, task)
}

async function verifyTaskPanelHistoryAndEscape(page: Page, title: string) {
  await page.goBack()
  await expectCalendarPanelClosed(page)
  await page.goForward()
  await expect(page.locator(TASK_PANEL)).toBeVisible()
  const closeStartedAt = await page.evaluate(() => performance.now())
  await page.keyboard.press('Escape')
  await expectCalendarPanelClosed(page)
  expect(
    await recordedLayoutShiftSince(page, closeStartedAt),
    'closing a task panel should not shift the calendar',
  ).toBe(0)
  await expect(page.getByRole('link', { name: title, exact: true })).toBeFocused()
}

async function verifyTaskPanelScrollContainment(page: Page, title: string): Promise<void> {
  const panel = page.getByRole('dialog', { name: title })
  const scrollArea = panel.locator('div.overflow-y-auto')
  await expect(scrollArea).toHaveCount(1)
  const sourceScrollY = await page.evaluate(() => window.scrollY)
  await scrollArea.evaluate((element) => {
    const spacer = document.createElement('div')
    spacer.setAttribute('aria-hidden', 'true')
    spacer.style.height = '120vh'
    element.append(spacer)
  })
  await scrollArea.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  expect(await scrollArea.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(sourceScrollY)
  await expect(panel.locator('[data-slot="sheet-footer"] button', { hasText: 'Close' })).toBeInViewport()
}

async function verifyCanonicalTaskPage(page: Page, taskHref: string) {
  await page.goto(new URL(taskHref, page.url()).pathname)
  await expect(page.getByRole('heading', { name: 'Assignees' })).toBeVisible()
  await expect(page.locator(TASK_PANEL)).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath('task-page.png'), fullPage: true })
}

async function verifyTaskPanelCloseControls(page: Page, title: string) {
  await page.goto(CALENDAR_PATH)
  await page.getByRole('link', { name: title, exact: true }).click()
  await expectCalendarPanelOpen(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).first().click()
  await expectCalendarPanelClosed(page)
  if ((page.viewportSize()?.width ?? 0) > 600) {
    await page.getByRole('link', { name: title, exact: true }).click()
    await expect(page.locator(TASK_PANEL)).toBeVisible()
    await page.locator('[data-slot="sheet-overlay"]').click({ position: { x: 10, y: 10 } })
    await expectCalendarPanelClosed(page)
  }
}

async function verifyCalendarTaskPanelOpen(page: Page): Promise<CalendarTask> {
  await page.goto(CALENDAR_PATH)
  const task = await firstCalendarTask(page)
  const calendar = page.locator('section.ops-surface-card')
  const calendarBox = await calendar.boundingBox()
  if (calendarBox === null) throw new Error('calendar is not visible before opening a task')
  const openStartedAt = await page.evaluate(() => performance.now())
  await page.getByRole('link', { name: task.title, exact: true }).click()
  await expectCalendarPanelOpen(page)
  expect(
    await recordedLayoutShiftSince(page, openStartedAt),
    'opening a task panel should not shift the calendar',
  ).toBe(0)
  expect(await calendar.boundingBox()).toEqual(calendarBox)
  await verifyTaskPanelScrollContainment(page, task.title)
  await page.screenshot({ path: test.info().outputPath('task-panel.png'), fullPage: true })
  return task
}

async function verifyWorkspaceProfileAndBranding(page: Page) {
  await page.goto('/settings/profile')
  await expect(page.getByLabel('Name')).toHaveValue('Vivek Thapar')
  await expect(page.getByRole('heading', { name: 'Change password', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Change password', exact: true })).toBeVisible()
  await page.goto('/settings/branding')
  await expect(page.getByLabel('Corner radius')).toHaveValue('md')
}

async function verifySearchableTimezone(page: Page) {
  await page.goto('/settings/general')
  await expect(page.getByLabel('Workspace name')).toHaveValue('Mirch Media')
  const timeZone = page.getByRole('combobox', { name: 'Time zone' })
  await timeZone.click()
  await timeZone.fill('Kolkata')
  const timeZoneOption = page.getByRole('option', { name: 'Asia/Kolkata' })
  await expect(timeZoneOption).toBeVisible()
  await timeZoneOption.click()
  await expect(timeZone).toHaveValue('Asia/Kolkata')
}

async function captureNotificationResponse(response: Response, diagnostics: string[]): Promise<void> {
  const headers = response.headers()
  try {
    const body = await response.body()
    diagnostics.push(
      JSON.stringify({
        status: response.status(),
        headers: {
          'content-type': headers['content-type'] ?? '',
          'x-powered-by': headers['x-powered-by'] ?? '',
        },
        body: body.toString('utf8').slice(0, 500),
      }),
    )
  } catch (error: unknown) {
    diagnostics.push(
      JSON.stringify({ status: response.status(), bodyError: error instanceof Error ? error.message : String(error) }),
    )
  }
}

// eslint-disable-next-line max-lines-per-function, max-statements -- one deterministic route-health flow keeps the audit atomic.
test('customer routes load without browser failures and stay within the response budget', async ({ page }) => {
  const consoleIssues: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []
  const expectedNavigationCancels: string[] = []
  const expectedWebKitNavigationCancels: string[] = []
  const badResponses: string[] = []
  const notificationDiagnostics: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error')
      consoleIssues.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    // WebKit reports canceled same-origin RSC prefetches through pageerror instead of only requestfailed.
    // Navigation and route assertions below still verify that the destination rendered successfully.
    if (error.message.includes('_rsc=') && error.message.includes('due to access control checks.')) {
      expectedWebKitNavigationCancels.push(error.message.split('\n', 1)[0] ?? error.message)
      return
    }
    pageErrors.push(`${page.url()}\n${error.message}\n${error.stack ?? ''}`)
  })
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? ''
    const url = request.url()
    const isRscPrefetch = (() => {
      try {
        return new URL(url).searchParams.has('_rsc')
      } catch {
        return false
      }
    })()
    // Next intentionally cancels speculative RSC prefetches when a navigation supersedes them.
    // Keep all other request failures fatal; this narrow classification avoids hiding app/network errors.
    if (isRscPrefetch && (failure === 'net::ERR_ABORTED' || failure === 'cancelled')) {
      expectedNavigationCancels.push(`${request.method()} ${url}`)
      return
    }
    failedRequests.push(`${request.method()} ${url} ${failure}`)
  })
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname
    if (path === '/api/v1/notifications/unread-count') {
      void captureNotificationResponse(response, notificationDiagnostics)
    }
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

  const detailRoutes = await availableDetailRoutes(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const dashboardTask = page.locator('a[data-task-link-id]').first()
  const dashboardTaskTitle = await dashboardTask.evaluate((link) => link.firstChild?.textContent?.trim() ?? '')
  if (dashboardTaskTitle === '') throw new Error('dashboard task link has no title')
  await expect(page.locator('a[href="/my-tasks"]').filter({ hasText: 'My open tasks' })).toHaveCount(1)
  await expect(page.locator('a[href="/leads"]').filter({ hasText: 'Open leads' })).toHaveCount(1)
  await expect(page.locator('a[href="/deals"]').filter({ hasText: 'Open deals' })).toHaveCount(1)
  await expect(page.locator('a[href="/leads/new"]').filter({ hasText: 'New lead' })).toHaveCount(1)
  const taskDetail = await page.locator('a[href^="/tasks/"]').first().getAttribute('href')
  if (taskDetail === null) throw new Error('no task detail link found on dashboard')
  detailRoutes.splice(1, 0, taskDetail)
  await page.goto(TASK_PATH, { waitUntil: 'domcontentloaded' })
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
      await expect(page.getByRole('heading', { name: 'Email', exact: true })).toBeVisible({ timeout: 15_000 })
      await page.getByRole('tab', { name: 'Tasks' }).click()
      await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible({ timeout: 15_000 })
      await page.getByRole('tab', { name: 'Files' }).click()
      await expect(page.getByRole('heading', { name: 'Files', exact: true })).toBeVisible({ timeout: 15_000 })
    }
  }

  await page.goto('/leads', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Search workspace' }).click()
  await page.getByPlaceholder('Search people, deals, projects, tasks…').fill(dashboardTaskTitle)
  await expect(page.getByText(dashboardTaskTitle, { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  console.log(`notification-diagnostics: ${notificationDiagnostics.join(' | ')}`)
  test.info().annotations.push({
    type: 'expected-navigation-cancels',
    description: String(expectedNavigationCancels.length + expectedWebKitNavigationCancels.length),
  })
  expect(pageErrors, pageErrors.join('\n')).toEqual([])
  expect(failedRequests, failedRequests.join('\n')).toEqual([])
  expect(badResponses, badResponses.join('\n')).toEqual([])
  expect(consoleIssues, consoleIssues.join('\n')).toEqual([])
  test.info().annotations.push({ type: 'route-timings', description: timings.join(', ') })
})

test('task details preserve origin in contextual mode and render canonically when deep-linked', async ({ page }) => {
  await signIn(page)
  const task = await verifyCalendarTaskPanelOpen(page)
  await verifyTaskPanelHistoryAndEscape(page, task.title)
  await verifyCanonicalTaskPage(page, task.href)
  await verifyTaskPanelCloseControls(page, task.title)
  await verifyTaskSourceInteractions(page, task)
})

test('organization edit form preserves saved business contact fields', async ({ page }) => {
  await signIn(page)
  await page.goto('/organizations/f1ab06e3-8c98-40e2-abcb-3799c49c4d0f/edit')

  await expect(page.getByLabel('Organization name')).toHaveValue('AGR Gold')
  await expect(page.getByLabel('Website')).toHaveValue('https://agrgold.com')
  await expect(page.getByLabel('Email')).toHaveValue('customerservice@agrgold.com')
  await expect(page.getByLabel('Phone')).toHaveValue('+1 212-391-1012')
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

async function createStaffInvitation(page: Page): Promise<{ readonly email: string; readonly token: string }> {
  const email = `acceptance-${String(Date.now())}@example.test`
  const emailInput = page.getByLabel('Teammate email')
  await emailInput.fill(email)
  await page.getByLabel('Member role').selectOption('staff')
  await expect(emailInput).toHaveValue(email)
  await page.getByRole('button', { name: 'Invite', exact: true }).click()
  const created = page.getByRole('status').filter({ hasText: 'Invitation created.' })
  await expect(created).toContainText('/invite/')
  await expect(created.getByRole('button', { name: 'Copy invitation link' })).toBeVisible()
  const token = /\/invite\/([a-f0-9]{64})/.exec(await created.innerText())?.[1]
  if (token === undefined) throw new Error('invitation link has no valid token')
  await page.goto(`/invite/${token}`)
  await expect(page.getByRole('button', { name: 'Accept invitation', exact: true })).toBeVisible()
  return { email, token }
}

test('owner can invite a staff member and revoke the pending link', async ({ page, isMobile }) => {
  await signIn(page)
  await page.goto(MEMBERS_PATH)
  const { email, token } = await createStaffInvitation(page)
  await page.goto(MEMBERS_PATH)
  const invitation = isMobile
    ? page.locator('article').filter({ hasText: email })
    : page.getByRole('row').filter({ hasText: email })
  await invitation.getByRole('button', { name: 'Revoke', exact: true }).click()
  await page.getByRole('button', { name: 'Revoke invitation', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Invitation revoked.' })).toBeVisible()
  await page.goto(`/invite/${token}`)
  await expect(page.getByRole('heading', { name: 'Invitation unavailable', exact: true })).toBeVisible()
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
  await page.goto(MEMBERS_PATH)
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()
  const editAccess = page.locator('summary:visible', { hasText: 'Edit access' }).first()
  await expect(editAccess).toBeVisible()
  await editAccess.click()
  await expect(page.getByRole('button', { name: 'Save access', exact: true }).first()).toBeVisible()
})

test('workspace settings reopen with tenant values intact', async ({ page }) => {
  await signIn(page)
  await verifyWorkspaceProfileAndBranding(page)
  await verifySearchableTimezone(page)
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

function staffTaskScopeFixtures() {
  const staffTasks = TASKS.filter((task) => task.assignees.includes('staff1'))
  const otherStaffTask = TASKS.find((task) => task.assignees.includes('staff2') && !task.assignees.includes('staff1'))
  const panelTask = staffTasks[0]
  if (panelTask === undefined || otherStaffTask === undefined) throw new Error('task scope fixtures are incomplete')
  return { staffTasks, otherStaffTask, panelTask }
}

async function verifyStaffTaskScope(page: Page, fixture: ReturnType<typeof staffTaskScopeFixtures>): Promise<void> {
  const content = page.locator('main')
  for (const task of fixture.staffTasks) await expect(content).toContainText(task.title)
  await expect(content).not.toContainText(fixture.otherStaffTask.title)
  await verifyTaskSourcePanel(page, { route: '/my-tasks', title: fixture.panelTask.title })
}

test('staff My Tasks is assignment-scoped and member administration is denied', async ({ page }) => {
  const fixture = staffTaskScopeFixtures()
  const staffEmail = USERS.find((user) => user.key === 'staff1')?.email ?? ''
  await page.goto('/login')
  await page.getByLabel('Email').fill(staffEmail)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/my-tasks')
  await verifyStaffTaskScope(page, fixture)

  const denied = await page.goto(MEMBERS_PATH)
  expect(denied?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Members', exact: true })).toHaveCount(0)
})

test('customer surfaces default to light mode under a dark operating-system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
})

test('record email composer validates, confirms and persists a sent message', async ({ page }) => {
  await signIn(page)
  await page.goto('/contacts', { waitUntil: 'domcontentloaded' })
  const detail = await firstDetailHref(page, '/contacts')
  if (detail !== undefined) await exerciseRecordEmail(page, detail)
})

async function exerciseRecordEmail(page: Page, detail: string): Promise<void> {
  await page.goto(detail, { waitUntil: 'domcontentloaded' })
  await page.getByRole('tab', { name: 'Email' }).click()
  await page.locator('#email-to').fill('recipient@example.com')
  await page.locator('#email-subject').fill('Follow-up')
  await page.locator('#email-body').fill('Thanks for the update.')
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Message sent.', { timeout: 15_000 })
}

async function findWonStageId(stage: Locator): Promise<string> {
  return stage.locator('option').evaluateAll((options) => {
    const won = options.find((option) => option.textContent.trim() === 'Won')
    return won instanceof HTMLOptionElement ? won.value : ''
  })
}

async function exerciseWonAndReopen(page: Page, wonStageId: string): Promise<void> {
  const stage = page.locator('#deal-stage')
  await page.getByRole('button', { name: 'Mark won', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Reopen', exact: true })).toBeVisible()
  await expect(stage).toHaveValue(wonStageId)
  await page.reload()
  await expect(stage).toHaveValue(wonStageId)
  await page.getByRole('button', { name: 'Reopen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mark won', exact: true })).toBeVisible()
  await expect(stage).not.toHaveValue(wonStageId)
  await page.reload()
  await expect(stage).not.toHaveValue(wonStageId)
}

async function restoreDealStage(
  page: Page,
  original: { href: string; stageId: string; wonStageId: string },
): Promise<void> {
  const stage = page.locator('#deal-stage')
  await page.goto(original.href)
  if ((await stage.inputValue()) === original.wonStageId) {
    await page.getByRole('button', { name: 'Reopen', exact: true }).click()
  }
  if ((await stage.inputValue()) !== original.stageId) await stage.selectOption(original.stageId)
  await page.reload()
  await expect(stage).toHaveValue(original.stageId)
}

async function verifyDealBoardOwner(page: Page): Promise<void> {
  const dealCard = page.locator('[data-card-id]').filter({ hasText: DEAL_TITLE })
  const ownerName = USERS.find((user) => user.key === 'manager')?.name ?? ''
  expect(ownerName).not.toBe('')
  await page.goto('/deals/board')
  await expect(dealCard).toContainText(`Owner: ${ownerName}`)
  await expect(dealCard).toContainText('Expected close:')
}

test('deal can be won and reopened with the persisted stage reflected in controls', async ({ page }) => {
  await signIn(page)
  await verifyDealBoardOwner(page)
  await page.goto('/deals')
  const dealHref = await page.getByRole('link', { name: DEAL_TITLE, exact: true }).getAttribute('href')
  if (dealHref === null) throw new Error('seeded website deal has no detail link')
  await page.goto(dealHref)

  const stage = page.locator('#deal-stage')
  const initialStageId = await stage.inputValue()
  const wonStageId = await findWonStageId(stage)
  expect(wonStageId).not.toBe('')

  try {
    await exerciseWonAndReopen(page, wonStageId)
  } finally {
    // Always restore the seeded fixture, including when an assertion catches a stale control state.
    await restoreDealStage(page, { href: dealHref, stageId: initialStageId, wonStageId })
  }
})

interface DealBoardMoveContext {
  readonly card: Locator
  readonly href: string
  readonly source: Locator
  readonly sourceStageId: string
  readonly destination: Locator
  readonly sourceHeading: string
  readonly destinationHeading: string
  readonly sourceCount: number
  readonly destinationCount: number
}

function dealCard(page: Page): Locator {
  return page.locator('[data-card-id]').filter({ hasText: DEAL_TITLE })
}

async function countInColumn(column: Locator): Promise<number> {
  return Number(await column.locator('header').locator('span').last().innerText())
}

async function dealBoardMoveContext(page: Page): Promise<DealBoardMoveContext> {
  await page.goto('/deals/board')
  const card = dealCard(page)
  const href = await card.getByRole('link', { name: DEAL_TITLE, exact: true }).getAttribute('href')
  if (href === null) throw new Error('seeded website deal has no detail link')
  const sourceStageId = await page.locator('section[data-stage-id]').filter({ has: card }).getAttribute('data-stage-id')
  if (sourceStageId === null) throw new Error('seeded website deal has no stage')
  const source = page.locator(`section[data-stage-id="${sourceStageId}"]`)
  const destinationHeadingMatcher = new RegExp(`^${DEAL_TARGET_STAGE}`)
  const targetColumn = page.locator('section[data-stage-id]').filter({
    has: page.getByRole('heading', { name: destinationHeadingMatcher }),
  })
  const destinationStageId = await targetColumn.getAttribute('data-stage-id')
  if (destinationStageId === null || destinationStageId === sourceStageId) {
    throw new Error(`seeded website deal cannot move to ${DEAL_TARGET_STAGE} from its current stage`)
  }
  const destination = page.locator(`section[data-stage-id="${destinationStageId}"]`)
  const [sourceHeading, targetHeading, sourceCount, targetCount] = await Promise.all([
    source.getByRole('heading').innerText(),
    destination.getByRole('heading').innerText(),
    countInColumn(source),
    countInColumn(destination),
  ])
  return {
    card,
    href,
    source,
    sourceStageId,
    destination,
    sourceHeading,
    destinationHeading: targetHeading,
    sourceCount,
    destinationCount: targetCount,
  }
}

async function moveDealAndExpectTotals(context: DealBoardMoveContext, page: Page): Promise<void> {
  await context.card.getByRole('button', { name: 'Move to…' }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${DEAL_TARGET_STAGE} ·`) }).click()
  await expect(context.destination).toContainText(DEAL_TITLE)
  await expect(context.source.getByRole('heading')).not.toHaveText(context.sourceHeading)
  await expect(context.destination.getByRole('heading')).not.toHaveText(context.destinationHeading)
  await expect(context.source.locator('header').locator('span').last()).toHaveText(String(context.sourceCount - 1))
  await expect(context.destination.locator('header').locator('span').last()).toHaveText(
    String(context.destinationCount + 1),
  )
}

async function verifyDealBoardTotals(page: Page): Promise<void> {
  const context = await dealBoardMoveContext(page)
  try {
    await moveDealAndExpectTotals(context, page)
  } finally {
    await restoreDealStage(page, { href: context.href, stageId: context.sourceStageId, wonStageId: '' })
  }
}

test('deal board refreshes stage totals after a move and restores the seeded stage', async ({ page }) => {
  await signIn(page)
  await verifyDealBoardTotals(page)
})
