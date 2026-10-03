import { createBillingRepository } from '@ops/adapter-payload'
import { systemClock } from '@ops/kernel'
import type { BillingDeps } from '@ops/module-billing'
import { can } from '@ops/platform'
import { recordAuditEvent } from '../audit/record'
import { getRequestContext, type RequestContext } from '../container'

/** Per-request billing dependencies for the signed-in user; each event goes to the security log. */
export async function billingDeps(requestContext?: RequestContext): Promise<BillingDeps> {
  const context = requestContext ?? (await getRequestContext())
  return {
    actor: context.actor,
    can,
    repo: createBillingRepository(context.req),
    clock: systemClock,
    audit: (event) => recordAuditEvent(context, event),
  }
}
