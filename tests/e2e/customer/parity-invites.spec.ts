import { expect, test, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Parity row 40: an invitation shows a copyable link, refuses a duplicate, can be resent, and a person can accept it.
const MEMBERS = '/settings/members'
test.describe.configure({ mode: 'serial' })

async function invite(page: Page, email: string): Promise<void> {
  await page.getByLabel('Teammate email').fill(email)
  await page.getByLabel('Member role').selectOption('staff')
  await page.getByRole('button', { name: 'Invite', exact: true }).click()
}

async function inviteToken(page: Page): Promise<string> {
  const created = page.getByRole('status').filter({ hasText: 'Invitation created.' })
  await expect(created).toContainText('/invite/')
  const token = /\/invite\/([a-f0-9]{64})/.exec(await created.innerText())?.[1]
  if (token === undefined) throw new Error('the invitation link has no token')
  return token
}

async function acceptAs(page: Page, input: { token: string; name: string }): Promise<void> {
  await page.goto(`/invite/${input.token}`, { waitUntil: 'networkidle' })
  await page.locator('#auth-name').fill(input.name)
  await page.locator('#auth-password').fill('Parity-pass-1234')
  await page.locator('#auth-confirm').fill('Parity-pass-1234')
  await page.getByRole('button', { name: 'Accept invitation', exact: true }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 60_000 })
}

async function resendFor(page: Page, email: string): Promise<void> {
  await page.goto(MEMBERS, { waitUntil: 'networkidle' })
  const row = page
    .getByRole('row')
    .filter({ hasText: email })
    .or(page.locator('article').filter({ hasText: email }))
  await row
    .locator('visible=true')
    .first()
    .getByRole('button', { name: /resend/i })
    .click()
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /resent|sent/i })
      .first(),
  ).toBeVisible()
}

async function refuseDuplicate(page: Page, email: string): Promise<void> {
  await page.goto(MEMBERS, { waitUntil: 'networkidle' })
  await invite(page, email)
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /already|pending|exists/i })
      .first(),
  ).toBeVisible()
}

async function inviteAndResend(page: Page): Promise<void> {
  const other = `second-${String(Date.now())}@example.test`
  await page.goto(MEMBERS, { waitUntil: 'networkidle' })
  await invite(page, other)
  await inviteToken(page)
  await resendFor(page, other)
}

test('an invitation refuses a duplicate, can be resent, and is accepted into a staff account', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000)
  await signInAs(page, 'owner')
  await page.goto(MEMBERS, { waitUntil: 'networkidle' })
  const email = `invitee-${String(Date.now())}@example.test`
  await invite(page, email)
  const token = await inviteToken(page)
  await refuseDuplicate(page, email)
  // A resent invitation gets a fresh link, so resend is checked on a second address.
  await inviteAndResend(page)
  const newcomer = await browser.newContext()
  const accepted = await newcomer.newPage()
  await acceptAs(accepted, { token, name: 'Parity Newcomer' })
  expect((await accepted.goto(MEMBERS))?.status()).toBe(404)
  await newcomer.close()
})
