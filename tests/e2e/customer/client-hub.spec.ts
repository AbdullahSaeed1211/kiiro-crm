import { expect, test } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Tabs on a record page switch in the browser without asking the server again, so a tab's content has to be part of
// the page. The Billing tab once loaded only from a direct link and stayed empty when clicked.
test('an owner opens a client and the Billing tab shows its actions when clicked', async ({ page }) => {
  test.setTimeout(90_000)
  await signInAs(page, 'owner')
  await page.goto('/organizations', { waitUntil: 'networkidle' })
  await page.locator('a[href^="/organizations/"]:not([href$="new"])').locator('visible=true').first().click()
  await expect(page).toHaveURL(/\/organizations\/[^/?]+$/)
  await expect(page.getByText('Outstanding').first()).toBeVisible()
  await page.getByRole('tab', { name: 'Billing' }).click()
  await expect(page.getByRole('link', { name: 'New invoice' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'New quote' })).toBeVisible()
})

test('staff see a client without the Billing tab', async ({ page }) => {
  test.setTimeout(90_000)
  await signInAs(page, 'staff1')
  await page.goto('/organizations', { waitUntil: 'networkidle' })
  const first = page.locator('a[href^="/organizations/"]:not([href$="new"])').locator('visible=true').first()
  if ((await first.count()) === 0) return
  await first.click()
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Billing' })).toHaveCount(0)
})
