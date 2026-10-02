import { expect, test } from '@playwright/test'
import { DEV_PASSWORD, USERS } from '../../../scripts/seed/data'

const OWNER_EMAIL = USERS.find((user) => user.key === 'owner')?.email ?? ''
const FILE =
  'First Name,Surname,E-mail Address,Mobile Phone,Lifecycle Stage\nAda,Lovelace,ada@mapping.test,+15550100,Customer\n'

test('an import file from another tool is matched to our columns before the check', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill(OWNER_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(DEV_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 60_000 })
  await page.goto('/settings/import')
  await page.locator('input[type=file]').setInputFiles({
    name: 'other-tool.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(FILE),
  })
  await expect(page.getByRole('group', { name: 'Match the columns' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel('Goes into: First Name')).toHaveValue('firstName')
  await expect(page.getByLabel('Goes into: Surname')).toHaveValue('lastName')
  await expect(page.getByLabel('Goes into: E-mail Address')).toHaveValue('email')
  await expect(page.getByLabel('Goes into: Mobile Phone')).toHaveValue('phone')
  await page.getByRole('button', { name: 'Check file' }).click()
  await expect(page.getByRole('status')).toContainText('1 can be created')
})
