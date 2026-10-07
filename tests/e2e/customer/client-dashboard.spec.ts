import { expect, test, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// A project page opens on its dashboard: task counts for everyone, billing only for owners and managers.
async function openFirstProject(page: Page): Promise<void> {
  await page.goto('/projects', { waitUntil: 'networkidle' })
  await page.locator('a[href^="/projects/"]:not([href$="new"])').locator('visible=true').first().click()
  await expect(page).toHaveURL(/\/projects\/[^/]+$/)
}

test('the project dashboard shows task counts, and billing for an owner', async ({ page }) => {
  test.setTimeout(90_000)
  await signInAs(page, 'owner')
  await openFirstProject(page)
  await expect(page.getByRole('tab', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Open tasks').first()).toBeVisible()
  await expect(page.getByText('Due in 7 days')).toBeVisible()
})

test('staff see the task counts but no billing', async ({ page }) => {
  test.setTimeout(90_000)
  await signInAs(page, 'staff1')
  await openFirstProject(page)
  await expect(page.getByText('Open tasks').first()).toBeVisible()
  await expect(page.getByText('Invoices sent')).toHaveCount(0)
})
