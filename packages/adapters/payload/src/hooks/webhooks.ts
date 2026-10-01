import { deliverWebhook, webhooksFor, webhooksSchema, type Webhook, type WebhookEvent } from '@ops/module-crm'
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

const RETRY_DELAYS_MS = [1000, 5000] as const

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** True for a failure worth another try: the receiver was unreachable or had a server error, not a refusal like 400. */
const transient = (result: { readonly status: number | null }): boolean =>
  result.status === null || result.status >= 500

/** Sends the event, trying again after a short wait while the receiver is unreachable or erroring; returns the last result. */
async function deliverWithRetry(webhook: Webhook, event: WebhookEvent) {
  let result = await deliverWebhook(webhook, event)
  for (const delay of RETRY_DELAYS_MS) {
    if (result.ok || !transient(result)) break
    await pause(delay)
    result = await deliverWebhook(webhook, event)
  }
  return result
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
        const result = await deliverWithRetry(webhook, event)
        if (!result.ok) logger.warn('webhook.failed', { webhook: webhook.id, event: verb, status: result.status })
      }),
    ),
  )
}
