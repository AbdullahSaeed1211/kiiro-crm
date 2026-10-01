import { deliverWebhook, webhooksFor, webhooksSchema, type WebhookEvent } from '@ops/module-crm'
import { createJsonLogger } from '@ops/kernel'
import type { CollectionAfterChangeHook } from 'payload'
import { SETTINGS_GLOBAL } from '../contracts/names'

const logger = createJsonLogger()

type Schedule = (work: Promise<unknown>) => void

// Runs a delivery after the response when the host allows it (a Worker's `waitUntil`); otherwise it runs unattended.
let schedule: Schedule = (work) => {
  void work
}

/** Lets the host keep deliveries alive past the response that caused them. */
export function setWebhookScheduler(next: Schedule): void {
  schedule = next
}

const iso = (value: unknown): string => {
  const ms = typeof value === 'number' ? value : Date.now()
  return new Date(ms).toISOString()
}

/** Sends each new activity entry to the webhooks that want its verb; a failed delivery is logged, never raised. */
export const sendActivityWebhooks: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return
  const entry = doc as Record<string, unknown>
  const settings = await req.payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true, req })
  const parsed = webhooksSchema.safeParse(Reflect.get(settings, 'webhooks') ?? [])
  const verb = String(entry['verb'])
  const targets = parsed.success ? webhooksFor(parsed.data, verb) : []
  if (targets.length === 0) return
  const event: WebhookEvent = {
    id: String(entry['id']),
    event: verb,
    occurredAt: iso(entry['occurredAt']),
    recordType: String(entry['recordType']),
    recordId: String(entry['recordId']),
    data: entry['data'] ?? null,
  }
  schedule(
    Promise.all(
      targets.map(async (webhook) => {
        const result = await deliverWebhook(webhook, event)
        if (!result.ok) logger.warn('webhook.failed', { webhook: webhook.id, event: verb, status: result.status })
      }),
    ),
  )
}
