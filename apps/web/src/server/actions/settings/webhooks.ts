'use server'

import { invalidInput } from '@ops/kernel'
import { deliverWebhook, describeDelivery, webhooksSchema } from '@ops/module-crm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { actionError, actionFailure, actionOk, toActionResult, type ActionResult } from '../../action-result'
import { requireRole } from '../../auth/context'

const WEBHOOKS_PATH = '/settings/webhooks'
const testSchema = z.object({ id: z.string().min(1).max(64) }).strict()

/** Saves where record events are sent; owners only, because each entry carries a signing secret. */
export async function saveWebhooks(input: unknown): Promise<ActionResult> {
  const context = await requireRole('owner')
  const parsed = webhooksSchema.safeParse(input)
  if (!parsed.success) {
    return toActionResult({
      ok: false,
      error: invalidInput(parsed.error.issues[0]?.message ?? 'Check each webhook.', parsed.error.issues),
    })
  }
  try {
    await context.payload.updateGlobal({
      slug: 'settings',
      data: { webhooks: parsed.data },
      overrideAccess: true,
      req: context.req,
    })
    revalidatePath(WEBHOOKS_PATH)
    return actionOk()
  } catch (error) {
    return actionFailure(error, 'saveWebhooks', 'Unable to save.')
  }
}

/** Sends a sample event to one saved webhook and reports what its receiver answered. */
export async function testWebhook(input: unknown): Promise<ActionResult<{ readonly message: string }>> {
  const context = await requireRole('owner')
  const parsed = testSchema.safeParse(input)
  if (!parsed.success)
    return toActionResult({ ok: false, error: invalidInput('Choose a webhook.', parsed.error.issues) })
  try {
    const settings = await context.payload.findGlobal({
      slug: 'settings',
      depth: 0,
      overrideAccess: true,
      req: context.req,
    })
    const saved = webhooksSchema.safeParse(Reflect.get(settings, 'webhooks') ?? [])
    const webhook = saved.success ? saved.data.find((entry) => entry.id === parsed.data.id) : undefined
    if (webhook === undefined) return actionError('NOT_FOUND', 'Save the webhook before sending a test.')
    const result = await deliverWebhook(webhook, {
      id: crypto.randomUUID(),
      event: 'webhook.test',
      occurredAt: new Date().toISOString(),
      recordType: 'test',
      recordId: 'test',
      data: { message: 'This is a test event.' },
    })
    return actionOk({ message: describeDelivery(result) })
  } catch (error) {
    return actionFailure(error, 'testWebhook', 'Unable to send the test.')
  }
}
