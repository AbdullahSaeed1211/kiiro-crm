import { expect, test, type Locator, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Parity rows 08, 29 and 31: create, convert and close records in the browser, with a failed save in between.
test.describe.configure({ mode: 'serial' })

function unique(label: string): string {
  return `${label} ${String(Date.now())}`
}

/** Makes every POST to the matching path fail with a 500 until `restore` runs. */
async function failSaves(page: Page, pattern: string): Promise<() => Promise<void>> {
  await page.route(pattern, async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 500, body: 'rejected by test' })
    else await route.continue()
  })
  return () => page.unroute(pattern)
}

/** Clicks the submit button while saves fail, checks the dialog stays open with an alert, then retries. */
async function submitFailThenRetry(page: Page, dialog: Locator, input: { pattern: string; button: string }) {
  const restore = await failSaves(page, input.pattern)
  await dialog.getByRole('button', { name: input.button }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await restore()
  await dialog.getByRole('button', { name: input.button }).click()
  await expect(dialog).toBeHidden({ timeout: 30_000 })
}

async function createLead(page: Page, title: string): Promise<void> {
  await page.goto('/leads')
  await page.getByRole('button', { name: 'Create lead' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('dialog').getByRole('button', { name: 'Create lead' }).click()
  await expect(page).toHaveURL(/\/leads\/[^/]+$/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title)
}

test('a lead converts to a deal, survives a failed save, and shows as converted after a reload', async ({ page }) => {
  await signInAs(page, 'owner')
  const title = unique('Parity lead')
  await createLead(page, title)
  const leadUrl = page.url()
  await page.getByRole('button', { name: 'Convert', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Convert lead' })
  await dialog.getByRole('spinbutton').fill('4200')
  await submitFailThenRetry(page, dialog, { pattern: '**/leads/**', button: 'Convert lead' })
  await page.goto(leadUrl)
  await expect(page.getByText('Converted').first()).toBeVisible()
  await page.goto('/deals')
  await expect(page.getByRole('link', { name: title })).toBeVisible()
})

async function createDeal(page: Page, title: string): Promise<void> {
  await page.goto('/deals')
  await page.getByRole('button', { name: 'New deal' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create deal' })
  await dialog.getByLabel('Title').fill(title)
  await submitFailThenRetry(page, dialog, { pattern: '**/deals', button: 'Create deal' })
  await page.reload()
  await page.getByRole('link', { name: title }).click()
  await expect(page).toHaveURL(/\/deals\/[^/]+$/)
}

test('a deal is created, marked lost with a reason, reopened, and each step survives a reload', async ({ page }) => {
  await signInAs(page, 'owner')
  await createDeal(page, unique('Parity deal'))
  const dealUrl = page.url()
  await page.getByRole('button', { name: 'Mark lost' }).click()
  const dialog = page.getByRole('dialog', { name: /lost/i })
  await dialog.getByLabel('Note (optional)').fill('Chose another agency')
  await dialog
    .getByRole('button', { name: /mark.*lost|save|confirm/i })
    .last()
    .click()
  await expect(dialog).toBeHidden({ timeout: 30_000 })
  await page.goto(dealUrl)
  await expect(page.getByText('Lost').first()).toBeVisible()
  // A lost deal can be reopened, but cannot be marked lost again.
  await expect(page.getByRole('button', { name: 'Mark lost' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Reopen' }).click()
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeHidden({ timeout: 30_000 })
  await page.goto(dealUrl)
  await expect(page.getByRole('button', { name: 'Mark lost' })).toBeVisible()
})
