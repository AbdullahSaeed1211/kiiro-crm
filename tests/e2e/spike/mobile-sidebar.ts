import { expect as baseExpect, type Locator, type Page } from '@playwright/test'

const expect = baseExpect.configure({ timeout: 30_000 })

// Waits for hydration (the server-rendered desktop sidebar adds a second trigger) and for the panel to stop sliding
// in (Escape is ignored meanwhile), the two timing gaps that made this check flaky on a phone.
async function reopenAndEscape(page: Page, toggle: Locator, mobileSidebar: Locator): Promise<void> {
  await toggle.click()
  await expect(mobileSidebar).toBeVisible()
  await expect(mobileSidebar).not.toHaveAttribute('data-starting-style')
  await expect(async () => {
    await page.keyboard.press('Escape')
    await expect(mobileSidebar).toBeHidden({ timeout: 2_000 })
  }).toPass()
}

/** Opens, closes and reopens the phone sidebar from its trigger, the close button and Escape. */
export async function verifyMobileSidebar(page: Page): Promise<void> {
  const toggle = page.locator('[data-slot="sidebar-trigger"]')
  const mobileSidebar = page.locator('[data-slot="sidebar"][data-mobile="true"]')
  await expect(toggle).toHaveCount(1)
  await toggle.click()
  await expect(mobileSidebar).toBeVisible()
  await expect(mobileSidebar.getByRole('link', { name: 'Deals' })).toBeVisible()
  await expect(mobileSidebar.getByRole('link', { name: 'Contacts' })).toBeVisible()
  const closeButton = mobileSidebar.locator('[data-slot="sheet-close"]')
  await expect(closeButton).toBeVisible()
  await closeButton.click()
  await expect(mobileSidebar).toBeHidden()
  await reopenAndEscape(page, toggle, mobileSidebar)
}
