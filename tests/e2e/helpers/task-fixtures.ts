import { expect, type Page } from '@playwright/test'
import { TASKS } from '../../../scripts/seed/work-data'

export function assignedTaskTitle(userKey: 'staff1' | 'staff2'): string {
  const task = TASKS.find((candidate) => candidate.assignees.includes(userKey))
  if (task === undefined) throw new Error(`no task is assigned to ${userKey}`)
  return task.title
}

export async function firstDashboardTaskTitle(page: Page): Promise<string> {
  const task = page.locator('a[data-task-link-id]').first()
  const title = await task.evaluate((link) => link.firstChild?.textContent?.trim() ?? '')
  if (title === '') throw new Error('dashboard task link has no title')
  return title
}

export async function searchForDashboardTask(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Search workspace' }).click()
  const title = await firstDashboardTaskTitle(page)
  await page.getByPlaceholder('Search people, deals, projects, tasks…').fill(title)
  await expect(page.getByText(title, { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
}
