import { expect, test, type Locator, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(OWNER_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function verifyMobileSidebar(page: Page, sidebarToggle: Locator): Promise<void> {
  const content = page.locator('[data-slot="sidebar-inset"]')
  const contentBefore = await content.boundingBox()
  if (contentBefore === null) throw new Error('Inbox content is not visible before opening the sidebar')
  await sidebarToggle.click()
  const mobileSidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]')
  await expect(mobileSidebar).toBeVisible()
  const destinationPaths = await mobileSidebar
    .locator('a[href]')
    .evaluateAll((links) =>
      links.map((link) => new URL(link.getAttribute('href') ?? '/', window.location.origin).pathname),
    )
  expect(destinationPaths).toEqual([
    '/',
    '/',
    '/my-tasks',
    '/inbox',
    '/leads',
    '/deals',
    '/organizations',
    '/contacts',
    '/projects',
    '/tasks',
    '/calendar',
    '/timeline',
    '/reports',
    '/settings/profile',
    '/settings/general',
  ])
  await expect(mobileSidebar.getByRole('link', { name: 'Inbox', exact: true })).toHaveAttribute('aria-current', 'page')
  expect(await content.boundingBox()).toEqual(contentBefore)
  const closeButton = mobileSidebar.locator('[data-slot="sheet-close"]')
  await expect(closeButton).toBeVisible()
  await closeButton.click()
  await expect(mobileSidebar).toBeHidden()
  expect(await content.boundingBox()).toEqual(contentBefore)
}

async function verifyDesktopSidebar(page: Page, sidebarToggle: Locator): Promise<void> {
  const desktopSidebar = page.locator('[data-slot="sidebar"]:not([data-mobile="true"])')
  await expect(sidebarToggle).toHaveAccessibleName('Close navigation')
  await sidebarToggle.click()
  await expect(desktopSidebar).toHaveAttribute('data-state', 'collapsed')
  await expect(sidebarToggle).toHaveAccessibleName('Open navigation')
  await sidebarToggle.click()
  await expect(desktopSidebar).toHaveAttribute('data-state', 'expanded')
  await expect(sidebarToggle).toHaveAccessibleName('Close navigation')
}

async function verifySidebar(page: Page, isMobile: boolean): Promise<void> {
  const sidebarToggle = page.locator('[data-slot="sidebar-trigger"]')
  await expect(sidebarToggle).toBeVisible()
  if (isMobile) return verifyMobileSidebar(page, sidebarToggle)
  return verifyDesktopSidebar(page, sidebarToggle)
}

async function verifyMobileFolderRail(page: Page): Promise<void> {
  const navigation = page.getByRole('navigation', { name: 'Mail folders' })
  const layout = await navigation.evaluate((nav) => {
    const buttons = Array.from(nav.querySelectorAll('button'))
    const rows = new Set(buttons.map((button) => Math.round(button.getBoundingClientRect().top)))
    return { count: buttons.length, rowCount: rows.size, width: nav.clientWidth, scrollWidth: nav.scrollWidth }
  })
  expect(layout.count).toBe(4)
  expect(layout.rowCount).toBe(1)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width)
}

async function verifyInboxSearch(page: Page): Promise<void> {
  await page.getByRole('searchbox', { name: 'Search messages' }).fill('no matching conversation')
  await expect(page.getByText('No conversations match your search.')).toBeVisible()
}

async function verifyComposeRemainsDisabled(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Compose', exact: true }).filter({ visible: true }).first().click()
  const composer = page.getByRole('dialog', { name: 'New message' })
  await expect(composer).toBeVisible()
  await expect(composer.getByRole('button', { name: 'Send' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(composer).toHaveCount(0)
}

test('inbox exposes the mail-client layout and keeps compose sending disabled', async ({
  page,
  isMobile,
}, testInfo) => {
  await signIn(page)
  await page.goto('/inbox')
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Mail folders' })).toBeVisible()
  await expect(page.getByRole('searchbox', { name: 'Search messages' })).toBeVisible()
  if (!isMobile) await page.screenshot({ path: testInfo.outputPath('inbox-desktop.png'), fullPage: true })
  if (isMobile) await verifyMobileFolderRail(page)
  await verifySidebar(page, isMobile)
  await verifyInboxSearch(page)
  await verifyComposeRemainsDisabled(page)
})
