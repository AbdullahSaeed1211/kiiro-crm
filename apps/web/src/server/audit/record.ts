import type { RequestContext } from '../container'

/** One security or settings event. `summary` says what it is about in words; `data` holds the details. */
export interface AuditEvent {
  readonly verb: string
  readonly summary?: string
  readonly data?: Record<string, unknown>
}

/**
 * Appends an event to the audit log. A failed write is logged and swallowed: the action the person asked for has
 * already happened, and it must not fail because its record could not be kept.
 */
export async function recordAuditEvent(
  context: Pick<RequestContext, 'payload' | 'req' | 'actor'>,
  event: AuditEvent,
): Promise<void> {
  try {
    await context.payload.create({
      collection: 'auditEvents',
      data: {
        verb: event.verb,
        actor: context.actor.id,
        summary: event.summary ?? '',
        data: event.data ?? {},
        occurredAt: Date.now(),
      },
      overrideAccess: true,
      req: context.req,
    })
  } catch (error) {
    console.error('[audit] could not record', event.verb, error)
  }
}
