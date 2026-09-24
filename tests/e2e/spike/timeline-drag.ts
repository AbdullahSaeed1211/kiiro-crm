import { expect as baseExpect, type Locator, type Page, type Response } from '@playwright/test'
import { setTimeout as delay } from 'node:timers/promises'

const TWO_DAYS_PX = 88
const expect = baseExpect.configure({ timeout: 30_000 })
const BAR = '.wx-bar'
const TIMELINE_PATH = '/timeline'

const isPostTo =
  (path: string) =>
  (response: Response): boolean =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === path

/** Verifies a timeline drag persists after reload and restores the task's original dates. */
export async function verifyTimelineDragPersistence(page: Page): Promise<void> {
  const task = await prepareTimeline(page)
  await dragAndVerifyAfterReload(page, task)
  await restoreDatesAndVerify(page, task)
}

interface TimelineTask {
  readonly title: string
  readonly dates: Locator
  readonly before: string[]
  readonly mobile: boolean
  readonly originalX: number
}

async function prepareTimeline(page: Page): Promise<TimelineTask> {
  await page.goto(TIMELINE_PATH)
  const title = 'Design style guide'
  const mobile = (page.viewportSize()?.width ?? 0) <= 650
  if (mobile) await setTimelineMode(page, 'Grid')
  const dates = page.locator('.wx-row', { hasText: title }).locator('[data-col-id=":start"], [data-col-id=":end"]')
  const bar = page.locator(BAR, { hasText: title })
  await expect(dates.first()).toBeVisible()
  const before = await dates.allTextContents()
  if (mobile) await setTimelineMode(page, 'Chart')
  await expect(bar).toBeVisible()
  const originalBox = await bar.boundingBox()
  if (originalBox === null) throw new Error(`no bar for ${title}`)
  return { title, dates, before, mobile, originalX: originalBox.x }
}

async function dragAndVerifyAfterReload(page: Page, task: TimelineTask): Promise<void> {
  const saved = page.waitForResponse(isPostTo(TIMELINE_PATH))
  await dragTimelineBar(page, task.title)
  expect((await saved).ok()).toBe(true)
  await expect(task.dates).not.toHaveText(task.before)
  const after = await task.dates.allTextContents()
  await page.reload()
  await expect(task.dates).toHaveText(after)
}

async function restoreDatesAndVerify(page: Page, task: TimelineTask): Promise<void> {
  const currentBox = await page.locator(BAR, { hasText: task.title }).boundingBox()
  if (currentBox === null) throw new Error(`no bar for ${task.title}`)
  const restored = page.waitForResponse(isPostTo(TIMELINE_PATH))
  await dragTimelineBar(page, task.title, task.originalX - currentBox.x)
  expect((await restored).ok()).toBe(true)
  if (task.mobile) await setTimelineMode(page, 'Grid')
  await expect(task.dates).toHaveText(task.before)
  await page.reload()
  if (task.mobile) await setTimelineMode(page, 'Grid')
  await expect(task.dates).toHaveText(task.before)
}

async function setTimelineMode(page: Page, mode: 'Chart' | 'Grid'): Promise<void> {
  await page.getByRole('button', { name: mode, exact: true }).click()
}

/** Drags a task bar with a mouse on desktop or the Gantt's long-press gesture on touch devices. */
async function dragTimelineBar(page: Page, title: string, offsetX?: number): Promise<void> {
  const bar = page.locator('.wx-bar', { hasText: title })
  const box = await requireBarBox(bar, title)
  const viewportWidth = page.viewportSize()?.width ?? 0
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  const offset = chooseDragOffset(box, viewportWidth, offsetX)
  if (viewportWidth <= 650) {
    await touchDragBar(bar, { x, y, offset })
    return
  }
  await mouseDragBar(page, { x, y, offset })
}

async function requireBarBox(
  bar: Locator,
  title: string,
): Promise<NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>> {
  await bar.scrollIntoViewIfNeeded()
  const box = await bar.boundingBox()
  if (box === null) throw new Error(`no bar for ${title}`)
  return box
}

function chooseDragOffset(box: { x: number; width: number }, viewportWidth: number, requested?: number): number {
  if (requested !== undefined) return requested
  return box.x + box.width > viewportWidth * 0.8 ? -TWO_DAYS_PX : TWO_DAYS_PX
}

async function mouseDragBar(page: Page, input: { x: number; y: number; offset: number }): Promise<void> {
  const { x, y, offset } = input
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + offset, y, { steps: 10 })
  await page.mouse.up()
}

async function touchDragBar(bar: Locator, input: { x: number; y: number; offset: number }): Promise<void> {
  const dispatch = (type: 'touchstart' | 'touchmove' | 'touchend', clientX: number) =>
    bar.evaluate(
      (node, point) => {
        const touch = {
          identifier: 1,
          target: node,
          clientX: point.clientX,
          clientY: point.clientY,
          screenX: point.clientX,
          screenY: point.clientY,
        }
        const active = point.type === 'touchend' ? [] : [touch]
        const event = new Event(point.type, { bubbles: true, cancelable: true })
        Object.defineProperties(event, {
          touches: { value: active },
          targetTouches: { value: active },
          changedTouches: { value: [touch] },
        })
        node.dispatchEvent(event)
      },
      { type, clientX, clientY: input.y },
    )
  await dispatch('touchstart', input.x)
  await delay(350)
  await dispatch('touchmove', input.x + input.offset)
  await dispatch('touchend', input.x + input.offset)
}
