import { expect, test, type Page } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''
const SAVE_ERROR = "We couldn't save your changes. Please try again."

async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(OWNER_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function interceptFailedAction(page: Page, path: string): Promise<() => boolean> {
  let intercepted = false
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    intercepted = true
    return route.abort('failed')
  })
  return () => intercepted
}

async function checkIntakeCreateRecovery(page: Page): Promise<void> {
  await page.goto('/settings/intake')
  const wasIntercepted = await interceptFailedAction(page, '/settings/intake')
  await page.getByLabel('Form name').fill('Client intake')
  await page.getByLabel('Public key').fill('client-intake')
  const button = page.getByRole('button', { name: 'Create form' })
  await button.click()
  await expect(page.getByText('Could not create this form. Please try again.', { exact: true })).toBeVisible()
  await expect(button).toBeEnabled()
  expect(wasIntercepted()).toBe(true)
}

async function checkWorkflowCreateRecovery(page: Page): Promise<void> {
  await page.goto('/settings/workflows')
  const wasIntercepted = await interceptFailedAction(page, '/settings/workflows')
  await page.getByRole('button', { name: 'Add workflow' }).click()
  await page.getByRole('textbox', { name: 'Workflow name' }).last().fill('Website pipeline')
  await page.getByLabel('First stage').fill('Open')
  const button = page.getByRole('button', { name: 'Create workflow' })
  await button.click()
  await expect(page.getByText('Could not create this workflow. Please try again.', { exact: true })).toBeVisible()
  await expect(button).toBeEnabled()
  expect(wasIntercepted()).toBe(true)
}

test('settings save stays retryable after a request failure', async ({ page }) => {
  await signIn(page)
  await page.goto('/settings/general')

  let interceptedAction = false
  await page.route('**/settings/general', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    interceptedAction = true
    return route.abort('failed')
  })

  const saveButton = page.getByRole('button', { name: 'Save changes' })
  await saveButton.click()
  await expect(page.getByText(SAVE_ERROR, { exact: true })).toBeVisible()
  await expect(saveButton).toBeEnabled()
  expect(interceptedAction).toBe(true)
})

test('intake and workflow creation recover after rejected requests', async ({ page }) => {
  await signIn(page)
  await checkIntakeCreateRecovery(page)
  await checkWorkflowCreateRecovery(page)
})
