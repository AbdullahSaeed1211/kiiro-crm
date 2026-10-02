import { expect, test, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

const TASK_LINK = 'a[href^="/tasks/"][href*="panel=1"]:visible'

// Parity row 07: closing the task panel with an unsaved description asks first, and every way to close agrees.
async function openFirstTask(page: Page): Promise<string> {
  await page.goto('/tasks')
  const link = page.locator(TASK_LINK).first()
  const title = (await link.innerText()).trim()
  await link.click()
  await expect(page.getByRole('dialog', { name: title })).toBeVisible({ timeout: 30_000 })
  return title
}

async function typeUnsaved(page: Page, text: string): Promise<void> {
  const box = page.getByRole('dialog').getByRole('textbox').first()
  await box.fill(`${await box.inputValue()} ${text}`)
}

/** Escape and the Close button both ask; "Keep editing" returns to the text. */
async function askBeforeClosing(page: Page, title: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: title })
  const prompt = page.getByRole('alertdialog')
  await typeUnsaved(page, 'draft-note')
  await page.keyboard.press('Escape')
  await expect(prompt).toBeVisible()
  await expect(dialog).toBeVisible()
  await prompt.getByRole('button', { name: 'Keep editing' }).click()
  await expect(prompt).toBeHidden()
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click()
  await expect(prompt).toBeVisible()
}

test('closing the task panel with an unsaved description asks first', async ({ page }) => {
  await signInAs(page, 'owner')
  const title = await openFirstTask(page)
  const dialog = page.getByRole('dialog', { name: title })
  const prompt = page.getByRole('alertdialog')

  await askBeforeClosing(page, title)

  // Closing without saving drops the text; reopening shows the saved description only.
  await prompt.getByRole('button', { name: 'Close without saving' }).click()
  await expect(dialog).toBeHidden()
  await page.locator(TASK_LINK, { hasText: title }).first().click()
  await expect(page.getByRole('dialog', { name: title }).getByRole('textbox').first()).not.toHaveValue(/draft-note/)
})

/** Puts the original text back so later runs start from the same data. */
async function restoreDescription(page: Page, input: { title: string; original: string }): Promise<void> {
  await page.locator(TASK_LINK, { hasText: input.title }).first().click()
  const dialog = page.getByRole('dialog', { name: input.title })
  await expect(dialog.getByRole('textbox').first()).toHaveValue(/kept-note/)
  await dialog.getByRole('textbox').first().fill(input.original)
  await dialog.getByRole('button', { name: 'Save description' }).click()
  await expect(dialog.getByRole('status')).toBeVisible()
}

test('a saved description closes the task panel without asking', async ({ page }) => {
  await signInAs(page, 'owner')
  const title = await openFirstTask(page)
  const dialog = page.getByRole('dialog', { name: title })
  const original = await dialog.getByRole('textbox').first().inputValue()
  await typeUnsaved(page, 'kept-note')
  const save = dialog.getByRole('button', { name: 'Save description' })
  await save.click()
  // The button turns off once the saved text comes back, so the panel has nothing left to lose.
  await expect(save).toBeDisabled({ timeout: 30_000 })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)

  await restoreDescription(page, { title, original })
})

// Parity row 06: the dashboard and workspace search open a task over the page they started from.
async function expectPanelOverSource(page: Page, input: { title: string; source: string }): Promise<void> {
  await expect(page.getByRole('dialog', { name: input.title })).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(/\/tasks\/[^?]+\?panel=1/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: input.title })).toHaveCount(0)
  await expect(page).toHaveURL((url) => url.pathname === input.source)
}

test('the dashboard opens a task as a panel and returns to the dashboard', async ({ page }) => {
  await signInAs(page, 'owner')
  await page.goto('/')
  const link = page.locator('a[data-task-link-id]:visible').first()
  // The link text is the title followed by a due-date span, so read only the first text node.
  const title = ((await link.evaluate((element) => element.firstChild?.textContent)) ?? '').trim()
  await link.click()
  await expectPanelOverSource(page, { title, source: '/' })
})

test('workspace search opens a task as a panel over the current page', async ({ page }) => {
  await signInAs(page, 'owner')
  await page.goto('/deals/board')
  await page.getByRole('button', { name: 'Search workspace' }).click()
  await page.getByRole('combobox').first().fill('landing-page brief')
  await page
    .getByRole('option', { name: /Confirm landing-page brief/ })
    .first()
    .click()
  await expectPanelOverSource(page, { title: 'Confirm landing-page brief', source: '/deals/board' })
})
