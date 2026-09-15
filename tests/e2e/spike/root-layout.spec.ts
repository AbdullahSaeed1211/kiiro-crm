import { expect, test } from '@playwright/test'

const ROUTES = ['/', '/login'] as const
const DOCUMENT_NESTING_ERRORS = [/hydration/i, /<html> cannot be a child of <body>/i, /script tag while rendering/i]

for (const route of ROUTES) {
  test(`${route} renders without document-shell errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto(route)
    await expect(page.locator('body')).toBeVisible()

    expect(errors.filter((message) => DOCUMENT_NESTING_ERRORS.some((pattern) => pattern.test(message)))).toEqual([])
  })
}
