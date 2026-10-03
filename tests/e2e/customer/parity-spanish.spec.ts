import { expect, test, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Text rule: every screen added in the parity pass reads in Spanish when the workspace language is Spanish.
test.describe.configure({ mode: 'serial' })

/** Opens a page; a save that is still refreshing can cut the first attempt short, so one retry is allowed. */
async function open(page: Page, path: string): Promise<void> {
  try {
    await page.goto(path, { waitUntil: 'networkidle' })
  } catch {
    await page.goto(path, { waitUntil: 'networkidle' })
  }
}

async function setLocale(page: Page, value: 'en' | 'es'): Promise<void> {
  await page.goto('/settings/general', { waitUntil: 'networkidle' })
  await page.getByRole('combobox', { name: 'Locale', exact: true }).selectOption(value)
  await page.getByRole('button', { name: /Save changes|Guardar cambios/ }).click()
  await expect(
    page
      .getByRole('status')
      .or(page.getByText(/saved|guardad/i))
      .first(),
  ).toBeVisible({ timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

async function checkSpanishScreens(page: Page): Promise<void> {
  await open(page, '/leads?q=a&owner=me')
  await expect(page.getByRole('button', { name: 'Quitar todos' })).toBeVisible()
  await expect(page.getByText('Exportar CSV').first()).toBeVisible()
  await open(page, '/')
  await expect(page.getByText('Clientes potenciales por seguir hoy')).toBeVisible()
  await open(page, '/leads/00000000-0000-4000-8000-000000000000')
  await expect(page.getByText('No encontramos esa página')).toBeVisible()
  await open(page, '/settings/import')
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'a.csv', mimeType: 'text/csv', buffer: Buffer.from('First Name\nAda') })
  await expect(page.getByText('Relaciona las columnas')).toBeVisible({ timeout: 30_000 })
}

async function checkSpanishTaskPanel(page: Page): Promise<void> {
  await open(page, '/tasks')
  await page.locator('a[href^="/tasks/"][href*="panel=1"]:visible').first().click()
  const box = page.getByRole('dialog').getByRole('textbox').first()
  await expect(box).toBeVisible({ timeout: 30_000 })
  await box.fill(`${await box.inputValue()} borrador`)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toContainText('No guardaste tu descripción')
  await page.getByRole('button', { name: 'Cerrar sin guardar' }).click()
}

test('the new screens read in Spanish when the workspace language is Spanish', async ({ page }) => {
  test.setTimeout(150_000)
  await signInAs(page, 'owner')
  await setLocale(page, 'es')
  try {
    await checkSpanishScreens(page)
    await checkSpanishTaskPanel(page)
  } finally {
    await setLocale(page, 'en')
  }
  await open(page, '/')
  await expect(page.getByText('Leads to follow up today')).toBeVisible()
})
