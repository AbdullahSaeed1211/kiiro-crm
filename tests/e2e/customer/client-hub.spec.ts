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

// Contacts and leads build only the open tab, like clients: a click must bring that tab's content.
for (const [kind, list, link] of [
  ['contact', '/contacts', 'a[href^="/contacts/"]:not([href$="new"])'],
  ['lead', '/leads', 'a[href^="/leads/"]:not([href*="board"]):not([href*="follow"]):not([href$="new"])'],
] as const) {
  test(`every tab of a ${kind} opens when clicked`, async ({ page }) => {
    test.setTimeout(120_000)
    await signInAs(page, 'owner')
    await page.goto(list, { waitUntil: 'networkidle' })
    await page.locator(link).locator('visible=true').first().click()
    await expect(page.getByRole('tab', { name: 'Activity' })).toBeVisible()
    for (const name of ['Activity', 'Tasks', 'Files', 'Email', 'Notes']) {
      await page.getByRole('tab', { name }).click()
      await expect(page.getByRole('tab', { name, selected: true })).toBeVisible()
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
      await expect(page.getByText(/something went wrong|application error/i)).toHaveCount(0)
    }
  })
}
