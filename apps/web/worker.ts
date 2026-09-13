import { bridgeInboundEmail, dispatchCron, type InternalForwardEnv } from '@ops/adapter-cloudflare'
import openNext from './.open-next/worker.js'

// Typed with the bindings this entry uses rather than the generated `CloudflareEnv`: that type refers back to this
// module through the self-referencing service binding, and the cycle would erase the binding types.
const worker: ExportedHandler<InternalForwardEnv> = {
  fetch: openNext.fetch,
  scheduled: (controller, env, ctx) => {
    ctx.waitUntil(dispatchCron(env, controller.scheduledTime))
  },
  // Awaited rather than waitUntil so a failed forward can still reject the message before the handler returns.
  email: (message, env) => bridgeInboundEmail(env, message),
}

/** Tenant Worker entry: OpenNext serves HTTP; cron and inbound email are forwarded to internal routes (spec §13). */
export default worker
