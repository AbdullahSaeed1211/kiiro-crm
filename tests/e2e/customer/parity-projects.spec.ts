import { expect, test, type Page } from '@playwright/test'
import { USERS } from '../../../scripts/seed/data'
import { signInAs } from '../helpers/session'

// Parity rows 36 and 37: a project can be created, and a person added to it sees it until removed.
test.describe.configure({ mode: 'serial' })

const STAFF_NAME = USERS.find((user) => user.key === 'staff1')?.name ?? ''

async function createProject(page: Page, name: string): Promise<string> {
  await page.goto('/projects/new', { waitUntil: 'networkidle' })
  await page.locator('#record-field-name').fill(name)
  await page.locator('#record-field-description').fill('Made by the parity test')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page).toHaveURL(/\/projects\/[^/]+$/, { timeout: 30_000 })
  await expect(page.getByText(name).first()).toBeVisible()
  return page.url()
}

async function changeMember(page: Page, change: 'Add' | 'Remove'): Promise<void> {
  const label = change === 'Add' ? 'Add project member' : 'Remove project member'
  await page.getByRole('combobox', { name: label }).selectOption({ label: STAFF_NAME })
  await page.getByRole('button', { name: change, exact: true }).click()
  // Removing a member asks first.
  if (change === 'Remove') await page.getByRole('button', { name: 'Remove member', exact: true }).click()
}

async function expectMemberOption(page: Page, list: 'Add project member' | 'Remove project member'): Promise<void> {
  const options = page.getByRole('combobox', { name: list }).locator('option', { hasText: STAFF_NAME })
  await expect(options).toHaveCount(1)
}

async function projectsListShows(staff: Page, name: string, shown: boolean): Promise<void> {
  await staff.goto('/projects', { waitUntil: 'networkidle' })
  // The list renders a table and a phone card list; only the one on screen counts.
  await expect(staff.getByText(name).locator('visible=true')).toHaveCount(shown ? 1 : 0)
}

async function addThenRemoveMember(page: Page, staff: Page, input: { name: string; url: string }): Promise<void> {
  await changeMember(page, 'Add')
  await expectMemberOption(page, 'Remove project member')
  await projectsListShows(staff, input.name, true)
  await page.goto(input.url, { waitUntil: 'networkidle' })
  await changeMember(page, 'Remove')
  await expectMemberOption(page, 'Add project member')
  await projectsListShows(staff, input.name, false)
}

test('a project is created, shown to an added member, and hidden again when the member is removed', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000)
  const staffContext = await browser.newContext()
  const staff = await staffContext.newPage()
  await signInAs(staff, 'staff1')
  await signInAs(page, 'owner')
  const name = `Parity project ${String(Date.now())}`
  const url = await createProject(page, name)
  await projectsListShows(staff, name, false)
  await addThenRemoveMember(page, staff, { name, url })
  await staffContext.close()
})
