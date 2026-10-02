import { expect, test, type Page } from '@playwright/test'
import { USERS } from '../../../scripts/seed/data'
import { TASKS } from '../../../scripts/seed/work-data'
import { signInAs } from '../helpers/session'

// Parity row 41: a role change takes effect on the next request, and a denied role is denied on the route and the API.
test.describe.configure({ mode: 'serial' })

const STAFF_NAME = USERS.find((user) => user.key === 'staff2')?.name ?? ''

async function setRole(page: Page, role: 'Staff' | 'Manager'): Promise<void> {
  await page.goto('/settings/members')
  // The nearest block around the person's name that holds an "Edit access" control: a table row or a phone card.
  const row = page
    .locator(`xpath=//*[not(self::option)][normalize-space(text())='${STAFF_NAME}']/ancestor::*[.//details][1]`)
    .filter({ visible: true })
    .first()
  await row.getByText('Edit access').click()
  await row.getByRole('combobox').first().selectOption({ label: role })
  await row.getByRole('button', { name: 'Save access' }).click()
  await expect(row.getByText('Access saved.')).toBeVisible({ timeout: 30_000 })
}

interface Reach {
  readonly membersPage: number | undefined
  readonly exportApi: number
}

async function reachOf(page: Page): Promise<Reach> {
  const membersPage = (await page.goto('/settings/members'))?.status()
  const exportApi = (await page.request.get('/api/v1/export/leads')).status()
  return { membersPage, exportApi }
}

test('a role change applies to an open session on its next request and is undone cleanly', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000)
  const staffContext = await browser.newContext()
  const staff = await staffContext.newPage()
  await signInAs(staff, 'staff2')
  await signInAs(page, 'owner')
  expect(await reachOf(staff)).toEqual({ membersPage: 404, exportApi: 403 })
  await setRole(page, 'Manager')
  try {
    expect(await reachOf(staff)).toEqual({ membersPage: 200, exportApi: 200 })
  } finally {
    await setRole(page, 'Staff')
  }
  expect(await reachOf(staff)).toEqual({ membersPage: 404, exportApi: 403 })
  await staffContext.close()
})

// Parity row 39: reassigning a task shows pending and failure feedback, and the new assignee's My Tasks follows.
const STAFF_ONE_NAME = USERS.find((user) => user.key === 'staff1')?.name ?? ''
const TASK = TASKS.find((task) => task.assignees.includes('staff2') && !task.assignees.includes('staff1'))?.title ?? ''
const TASK_LINK = 'a[href^="/tasks/"][href*="panel=1"]:visible'

/** Adds or removes staff1 as an assignee, then waits for the chosen state to show in the panel. */
async function toggleStaffOne(page: Page, expected: 'added' | 'removed' | 'unchanged'): Promise<void> {
  const trigger = page.getByRole('dialog', { name: TASK }).getByRole('combobox', { name: 'Assignees' })
  await trigger.click()
  await page.getByRole('option', { name: STAFF_ONE_NAME }).click()
  await page.keyboard.press('Escape')
  if (expected === 'added') await expect(trigger).toContainText(STAFF_ONE_NAME)
  if (expected === 'removed') await expect(trigger).not.toContainText(STAFF_ONE_NAME)
}

async function openTaskPanel(page: Page): Promise<void> {
  await page.goto('/tasks')
  await page.locator(TASK_LINK, { hasText: TASK }).first().click()
  await expect(page.getByRole('dialog', { name: TASK })).toBeVisible()
}

async function failThenRetryAssignment(page: Page): Promise<void> {
  await openTaskPanel(page)
  await page.route('**/tasks**', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 500, body: 'rejected by test' })
    else await route.continue()
  })
  await toggleStaffOne(page, 'unchanged')
  await expect(page.getByRole('dialog', { name: TASK }).getByRole('status')).toContainText('did not work')
  await page.unroute('**/tasks**')
  await toggleStaffOne(page, 'added')
}

test('reassigning a task reports a failed save, then moves it to the new assignee', async ({ page, browser }) => {
  test.setTimeout(120_000)
  const staffContext = await browser.newContext()
  const staff = await staffContext.newPage()
  await signInAs(staff, 'staff1')
  await signInAs(page, 'owner')
  const staffMain = staff.locator('main').last()
  await staff.goto('/my-tasks')
  await expect(staffMain).not.toContainText(TASK)
  await failThenRetryAssignment(page)
  await staff.goto('/my-tasks')
  await expect(staffMain).toContainText(TASK)
  await toggleStaffOne(page, 'removed')
  await staff.goto('/my-tasks')
  await expect(staffMain).not.toContainText(TASK)
  await staffContext.close()
})

// Parity row 42: records outside a person's scope, and records that do not exist, return nothing over the API.
async function ownTaskId(page: Page, title: string): Promise<string> {
  const list = await page.request.get('/api/v1/tasks?pageSize=100')
  const records = ((await list.json()) as { data: { records: { id: string; title: string }[] } }).data.records
  return records.find((record) => record.title === title)?.id ?? ''
}

test('a staff member gets no data for another group task or an unknown id', async ({ browser }) => {
  test.setTimeout(120_000)
  const one = await browser.newContext()
  const two = await browser.newContext()
  const staffOne = await one.newPage()
  const staffTwo = await two.newPage()
  await signInAs(staffOne, 'staff1')
  await signInAs(staffTwo, 'staff2')
  const title = TASKS.find((task) => task.assignees.length === 1 && task.assignees[0] === 'staff1')?.title ?? ''
  const id = await ownTaskId(staffOne, title)
  expect(id, 'staff1 sees their own task through the API').not.toBe('')
  expect((await staffOne.request.get(`/api/v1/tasks/${id}`)).status()).toBe(200)
  expect([403, 404]).toContain((await staffTwo.request.get(`/api/v1/tasks/${id}`)).status())
  expect((await staffTwo.request.get('/api/v1/tasks/00000000-0000-4000-8000-000000000000')).status()).toBe(404)
  await one.close()
  await two.close()
})

// Parity row 38: group labels are separate from the security role; joining every group grants no admin access.
async function groupBoxes(page: Page) {
  const row = page
    .locator(`xpath=//*[not(self::option)][normalize-space(text())='${STAFF_NAME}']/ancestor::*[.//details][1]`)
    .filter({ visible: true })
    .first()
  await row.getByText('Edit access').click()
  return { row, boxes: row.getByRole('group', { name: 'Groups' }).getByRole('checkbox') }
}

/** Sets every group box to `checked`, or to the states in `restore`, and returns the states it found. */
async function setGroups(page: Page, input: { checked: boolean; restore?: readonly boolean[] }): Promise<boolean[]> {
  await page.goto('/settings/members')
  const { row, boxes } = await groupBoxes(page)
  const count = await boxes.count()
  const found: boolean[] = []
  for (let index = 0; index < count; index += 1) {
    found.push(await boxes.nth(index).isChecked())
    await boxes.nth(index).setChecked(input.restore?.[index] ?? input.checked)
  }
  await row.getByRole('button', { name: 'Save access' }).click()
  await expect(row.getByText('Access saved.')).toBeVisible({ timeout: 30_000 })
  return found
}

test('joining every group does not grant admin access', async ({ page, browser }) => {
  test.setTimeout(120_000)
  const staffContext = await browser.newContext()
  const staff = await staffContext.newPage()
  await signInAs(staff, 'staff2')
  await signInAs(page, 'owner')
  const before = await setGroups(page, { checked: true })
  try {
    expect(await reachOf(staff)).toEqual({ membersPage: 404, exportApi: 403 })
  } finally {
    await setGroups(page, { checked: false, restore: before })
  }
  await staffContext.close()
})
