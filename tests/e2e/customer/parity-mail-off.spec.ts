import { expect, test } from '@playwright/test'
import { sessionCookies } from '../helpers/session'

// Parity row 35: when outbound email is off for the tenant, every email control says so and offers no send.
// Run it with `pnpm test:e2e:mail-off`, which starts the app with MAIL_TRANSPORT=disabled.
const MAIL_OFF = process.env['MAIL_TRANSPORT'] === 'disabled'

test('with outbound email off, the settings, the record and the composer explain it', async ({ page, browser }) => {
  // The other suites run with email on, so this one only runs in its own pass.
  test.skip(!MAIL_OFF, 'needs the app started with MAIL_TRANSPORT=disabled')
  test.setTimeout(90_000)
  await page.context().addCookies(await sessionCookies(browser, 'owner'))
  await page.goto('/settings/email', { waitUntil: 'networkidle' })
  await expect(page.getByText('Unavailable').first()).toBeVisible()
  await page.goto('/leads', { waitUntil: 'networkidle' })
  const href = await page
    .locator('a[href^="/leads/"]:not([href*="board"]):not([href*="follow"]):not([href$="new"])')
    .locator('visible=true')
    .first()
    .getAttribute('href')
  await page.goto(href ?? '/leads', { waitUntil: 'networkidle' })
  await expect(page.getByRole('button', { name: 'Email', exact: true })).toBeDisabled()
  await page.getByRole('tab', { name: 'Email' }).click()
  await expect(page.getByRole('button', { name: /^send/i })).toHaveCount(0)
  await expect(page.getByText(/not available|unavailable|turned off|disabled/i).first()).toBeVisible()
})
