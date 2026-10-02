import { bridgeInboundEmail, dispatchCron, type InternalForwardEnv } from '@ops/adapter-cloudflare'
import openNext from './.open-next/worker.js'
import { isBlockedPayloadRoute, withSecurityHeaders } from './src/server/http-policy'

// Typed with the bindings this entry uses rather than the generated `CloudflareEnv`: that type refers back to this
// module through the self-referencing service binding, and the cycle would erase the binding types.
const worker: ExportedHandler<InternalForwardEnv> = {
  fetch: async (request, env, ctx) => {
    if (isBlockedPayloadRoute(request.method, new URL(request.url).pathname)) {
      return withSecurityHeaders(new Response('Not Found', { status: 404 }))
    }
    // `.open-next/worker.js` is untyped JavaScript once built, so its response type is declared here.
    const handled: unknown = await openNext.fetch(request, env, ctx)
    if (!(handled instanceof Response)) throw new TypeError('OpenNext did not return a Response')
    const response = handled
    return withSecurityHeaders(response, new URL(request.url).pathname)
  },
  scheduled: (controller, env, ctx) => {
    ctx.waitUntil(dispatchCron(env, controller.scheduledTime))
  },
  // Awaited rather than waitUntil so a failed forward can still reject the message before the handler returns.
  email: (message, env) => bridgeInboundEmail(env, message),
}

/** Tenant Worker entry: OpenNext serves HTTP; cron and inbound email are forwarded to internal routes (spec §13). */
export default worker
