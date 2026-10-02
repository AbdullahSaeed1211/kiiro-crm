import { expect, test, type Locator, type Page } from '@playwright/test'
import { signInAs } from '../helpers/session'

// Parity row 21: dragging a deal card between stages saves, survives a reload, and rolls back with a message on failure.
test.describe.configure({ mode: 'serial' })

async function createDeal(page: Page, title: string): Promise<void> {
  await page.goto('/deals')
  await page.getByRole('button', { name: 'New deal' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create deal' })
  await dialog.getByLabel('Title').fill(title)
  await dialog.getByRole('button', { name: 'Create deal' }).click()
  await expect(dialog).toBeHidden({ timeout: 30_000 })
}

/** A real browser drag from the card into the column; the board listens to native drag events. */
async function dragCardTo(card: Locator, column: Locator): Promise<void> {
  // Start on the card's padding: the middle of the card is the title link, which the browser drags as a link.
  await card.dragTo(column, { sourcePosition: { x: 8, y: 8 }, targetPosition: { x: 80, y: 160 } })
}

/** A stage column. Its label is "<stage> · <total>", and the total changes when cards move, so match the start. */
const column = (page: Page, stage: string): Locator => page.getByRole('region', { name: new RegExp(`^${stage} ·`) })

async function firstTwoStages(page: Page): Promise<[string, string]> {
  const labels = await page
    .getByRole('region')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label') ?? ''))
  const stages = labels.filter((label) => label.includes(' · ')).map((label) => label.split(' · ')[0] ?? '')
  const [first, second] = stages
  if (first === undefined || second === undefined) throw new Error('the deal board needs two stages')
  return [first, second]
}

async function failSaves(page: Page): Promise<() => Promise<void>> {
  await page.route('**/deals/board', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 500, body: 'rejected by test' })
    else await route.continue()
  })
  return () => page.unroute('**/deals/board')
}

async function dragFailsThenSaves(page: Page, input: { title: string; from: string; to: string }): Promise<void> {
  const card = column(page, input.from).locator('[draggable="true"]', { hasText: input.title })
  await expect(card).toBeVisible()
  const restore = await failSaves(page)
  await dragCardTo(card, column(page, input.to))
  await expect(page.getByText('Could not move the deal').filter({ visible: true }).first()).toBeVisible()
  await expect(column(page, input.from).getByText(input.title)).toBeVisible()
  await restore()
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/deals/board'))
  await dragCardTo(card, column(page, input.to))
  expect((await saved).ok()).toBe(true)
  await expect(column(page, input.to).getByText(input.title)).toBeVisible({ timeout: 30_000 })
}

test('a deal card dragged to another stage rolls back on a failed save, then saves and survives a reload', async ({
  page,
}) => {
  // Phones use the Move to… menu (covered by the task board tests); drag is a desktop shortcut.
  test.fixme((page.viewportSize()?.width ?? 0) < 768, 'drag is disabled below 768 px')
  test.setTimeout(120_000)
  await signInAs(page, 'owner')
  const title = `Parity drag ${String(Date.now())}`
  await createDeal(page, title)
  await page.goto('/deals/board')
  const [from, to] = await firstTwoStages(page)
  await dragFailsThenSaves(page, { title, from, to })
  await page.reload()
  await expect(column(page, to).getByText(title)).toBeVisible()
})

// Rows 22 and 24: the stage menu moves a card, and the column totals follow the move now and after a reload.
async function totalsOf(page: Page): Promise<Map<string, string>> {
  const labels = await page
    .getByRole('region')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label') ?? ''))
  return new Map(labels.filter((label) => label.includes(' · ')).map((label) => label.split(' · ') as [string, string]))
}

test('moving a deal with the stage menu updates both column totals and keeps them after a reload', async ({ page }) => {
  // The same board component is checked at 390 px with the task board (spike/smoke.spec.ts); only desktop here.
  test.fixme((page.viewportSize()?.width ?? 0) < 768, 'phone coverage is in the task board tests')
  test.setTimeout(60_000)
  await signInAs(page, 'owner')
  await page.goto('/deals/board', { waitUntil: 'networkidle' })
  const [from, to] = await firstTwoStages(page)
  const before = await totalsOf(page)
  // The first card on the board is in the first stage on both layouts.
  await page.getByRole('button', { name: 'Move to…' }).first().click()
  await page.getByRole('menuitem', { name: new RegExp(`^${to}`) }).click()
  await expect.poll(async () => (await totalsOf(page)).get(from)).not.toBe(before.get(from))
  const after = await totalsOf(page)
  expect(after.get(to)).not.toBe(before.get(to))
  await page.reload()
  expect(await totalsOf(page)).toEqual(after)
})
