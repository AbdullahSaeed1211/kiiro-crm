import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const CUSTOMER_ROUTES = [
  '/',
  '/leads',
  '/leads/board',
  '/leads/new',
  '/deals',
  '/deals/board',
  '/contacts',
  '/contacts/new',
  '/organizations',
  '/organizations/new',
  '/projects',
  '/projects/new',
  '/tasks',
  '/tasks/new',
  '/tasks/board',
  '/my-tasks',
  '/calendar',
  '/inbox',
  '/timeline',
  '/reports',
  '/settings/general',
  '/settings/profile',
  '/settings/branding',
  '/settings/terminology',
  '/settings/members',
  '/settings/notifications',
  '/settings/email',
  '/settings/intake',
  '/settings/groups',
  '/settings/workflows',
  '/settings/fields',
  '/settings/modules',
  '/settings/import',
  '/onboarding',
] as const

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(OWNER_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function captureAccessibleSurface(page: Page, name: string): Promise<void> {
  await assertNoSeriousAccessibilityViolations(page, name)
  if ((page.viewportSize()?.width ?? 0) <= 390) {
    await page.screenshot({ path: test.info().outputPath(`m3-${name}-390.png`), fullPage: true })
  }
}

async function assertNoSeriousAccessibilityViolations(page: Page, name: string): Promise<void> {
  const result = await new AxeBuilder({ page }).exclude('[data-base-ui-focus-guard]').withTags(AXE_TAGS).analyze()
  const serious = result.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  const findings = serious.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    elements: violation.nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
  }))
  expect(findings, `${name} serious or critical accessibility violations`).toEqual([])
}

async function firstDetailHref(page: Page, prefix: string): Promise<string | undefined> {
  const hrefs = await page
    .locator(`a[href^="${prefix}/"]`)
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href): href is string => href !== null),
    )
  const href = hrefs.find((value) => !value.endsWith('/new') && !value.includes('/board'))
  return href
}

async function assertMobileInboxFits(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 0) > 390) return
  const layout = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    folders: [...document.querySelectorAll('nav[aria-label="Mail folders"] button')].map((button) => {
      const rect = button.getBoundingClientRect()
      return { left: rect.left, right: rect.right }
    }),
  }))
  expect(layout.document, 'mobile inbox must not create horizontal page scrolling').toBeLessThanOrEqual(layout.viewport)
  expect(layout.folders).toHaveLength(4)
  expect(layout.folders.every(({ left, right }) => left >= 0 && right <= layout.viewport)).toBe(true)
}

async function assertMobileSettingsFits(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 0) > 390) return
  const layout = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Settings"]')
    if (nav === null) throw new Error('settings navigation is missing')
    const rect = nav.getBoundingClientRect()
    return {
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      navWidth: nav.scrollWidth,
      visibleWidth: rect.width,
      groups: nav.querySelectorAll(':scope > div').length,
    }
  })
  expect(layout.document, 'mobile settings must not create horizontal page scrolling').toBeLessThanOrEqual(
    layout.viewport,
  )
  expect(layout.navWidth).toBeLessThanOrEqual(layout.visibleWidth)
  expect(layout.groups).toBeGreaterThan(0)
}

async function auditCustomerRoutes(page: Page): Promise<void> {
  for (const route of CUSTOMER_ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main, [data-slot="card"]').first()).toBeVisible()
    await assertNoSeriousAccessibilityViolations(page, route)
    if (route === '/inbox') await assertMobileInboxFits(page)
    if (route === '/settings/general') await assertMobileSettingsFits(page)
  }
  for (const prefix of ['/projects', '/leads', '/deals', '/contacts', '/organizations']) {
    await page.goto(prefix)
    const detail = await firstDetailHref(page, prefix)
    if (detail === undefined) continue
    await page.goto(detail)
    await assertNoSeriousAccessibilityViolations(page, detail)
  }
}

async function auditPrimarySurfaces(page: Page): Promise<void> {
  await page.goto('/')
  await captureAccessibleSurface(page, 'shell')
  await page.goto('/tasks')
  await captureAccessibleSurface(page, 'list')
  await page.goto('/contacts')
  const contactDetail = await firstDetailHref(page, '/contacts')
  if (contactDetail !== undefined) {
    await page.goto(contactDetail)
    await captureAccessibleSurface(page, 'record')
  }
  await page.goto('/')
  const dashboardTasks = page.locator('a[data-task-link-id]')
  if ((await dashboardTasks.count()) > 0) {
    await dashboardTasks.first().click()
    await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible()
    await captureAccessibleSurface(page, 'sheet')
  }
}

async function auditCompactTimelineModes(page: Page, chart: Locator): Promise<void> {
  const chartMode = page.getByRole('button', { name: 'Chart', exact: true })
  const gridMode = page.getByRole('button', { name: 'Grid', exact: true })
  await expect(chartMode).toHaveAttribute('aria-pressed', 'true')
  await gridMode.click()
  await expect(chart).toBeHidden()
  await assertNoSeriousAccessibilityViolations(page, 'timeline grid mode')
  await chartMode.click()
  await expect(chart).toBeVisible()
  await expect(chartMode).toHaveAttribute('aria-pressed', 'true')
}

async function auditTimeline(page: Page): Promise<void> {
  await page.goto('/timeline')
  const chart = page.getByRole('region', { name: 'Task timeline chart' })
  await expect(chart).toBeVisible()
  if ((page.viewportSize()?.width ?? 0) <= 390) {
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }))
    expect(dimensions.content, 'the mobile timeline should not widen the document').toBeLessThanOrEqual(
      dimensions.viewport,
    )
  }
  if ((page.viewportSize()?.width ?? 0) > 650) {
    await page.screenshot({ path: test.info().outputPath('m3-timeline-desktop.png'), fullPage: true })
  } else {
    await auditCompactTimelineModes(page, chart)
  }
  await expect(chart).toHaveAttribute('tabindex', '0')
  await chart.focus()
  await expect(chart).toBeFocused()
  await captureAccessibleSurface(page, 'timeline')
}

test('customer shell, list, record and task sheet have no serious accessibility violations', async ({ page }) => {
  test.setTimeout(120_000)
  await signIn(page)
  await auditPrimarySurfaces(page)
  await auditTimeline(page)
  await auditCustomerRoutes(page)
})
