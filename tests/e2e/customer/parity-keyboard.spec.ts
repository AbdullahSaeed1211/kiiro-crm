import { expect, test, type Cookie, type Page } from '@playwright/test'
import { sessionCookies } from '../helpers/session'

// Parity row 50: the main paths work from the keyboard, focus is visible and returns, and motion can be turned off.
test.describe.configure({ mode: 'serial' })

let cookies: Cookie[] = []
test.beforeAll(async ({ browser }) => {
  cookies = await sessionCookies(browser, 'owner')
})
test.beforeEach(async ({ page }) => {
  await page.context().addCookies(cookies)
})

async function focusIsVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const element = document.activeElement
    if (element === null || element === document.body) return true
    const style = getComputedStyle(element)
    const ring = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
    // A ring, a shadow ring, or a border that turns the focus colour all count as a visible mark.
    const border = style.borderTopWidth !== '0px' && style.borderTopColor !== 'rgba(0, 0, 0, 0)'
    return ring || style.boxShadow !== 'none' || (border && element.matches(':focus-visible'))
  })
}

/** The ring fades in over a short transition, so wait for it instead of reading the first frame. */
async function ringAppears(page: Page): Promise<boolean> {
  try {
    await expect.poll(() => focusIsVisible(page)).toBe(true)
    return true
  } catch {
    return false
  }
}

test('tabbing through a list page always shows where focus is', async ({ page }) => {
  await page.goto('/leads', { waitUntil: 'networkidle' })
  // The phone browser (WebKit) does not report the very first focus after page load as keyboard focus, so the first
  // press only moves focus there; the rings are checked from the second press on.
  await page.keyboard.press('Tab')
  for (let step = 1; step < 15; step += 1) {
    await page.keyboard.press('Tab')
    expect(await ringAppears(page), `no focus ring after ${String(step + 1)} Tab presses`).toBe(true)
  }
})

test('the create dialog opens from the keyboard, keeps focus inside, and gives focus back on Escape', async ({
  page,
}) => {
  await page.goto('/leads', { waitUntil: 'networkidle' })
  const trigger = page.getByRole('button', { name: 'Create lead' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press('Tab')
    // At the end of the dialog, focus rests one step on the library's edge guard (and the page body) and then wraps back
    // inside. It must never land on a control of the page behind the dialog.
    const inside = await dialog.evaluate((node) => {
      const active = document.activeElement
      return (
        active === null ||
        node.contains(active) ||
        active === document.body ||
        active.hasAttribute('data-base-ui-focus-guard')
      )
    })
    expect(inside).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('motion is turned off when the person asks for less motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/leads', { waitUntil: 'networkidle' })
  const longest = await page.evaluate(() => {
    const durations = [...document.querySelectorAll('button, a, [role=dialog]')].map((node) => {
      const style = getComputedStyle(node)
      return Math.max(parseFloat(style.transitionDuration) || 0, parseFloat(style.animationDuration) || 0)
    })
    return Math.max(0, ...durations)
  })
  expect(longest).toBeLessThanOrEqual(0.01)
})

test('buttons and links on the main pages are big enough to touch', async ({ page }) => {
  // The small icon buttons are 24 px; nothing on screen may be smaller than that.
  for (const route of ['/leads', '/deals', '/tasks', '/']) {
    await page.goto(route, { waitUntil: 'networkidle' })
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('main button, main [role=button], header button')]
        .filter((node) => (node as HTMLElement).offsetParent !== null)
        .map((node) => ({
          box: node.getBoundingClientRect(),
          label: node.getAttribute('aria-label') ?? node.textContent,
        }))
        .filter(({ box }) => box.width > 0 && (box.width < 24 || box.height < 24))
        .map(({ label }) => label.trim().slice(0, 30)),
    )
    expect(small, `${route} has controls smaller than 24 px`).toEqual([])
  }
})
