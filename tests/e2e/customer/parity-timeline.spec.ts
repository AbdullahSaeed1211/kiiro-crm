import { expect, test } from '@playwright/test'
import { signInAs } from '../helpers/session'
import { verifyTimelineRollback } from '../spike/timeline-drag'

// Parity row 26: a rejected timeline change is reported and nothing is saved (the successful drag is in the smoke spec).
test('a rejected timeline drag reports the failure and keeps the old dates', async ({ page }) => {
  test.setTimeout(120_000)
  await signInAs(page, 'owner')
  await verifyTimelineRollback(page)
  expect(page.url()).toContain('/timeline')
})
