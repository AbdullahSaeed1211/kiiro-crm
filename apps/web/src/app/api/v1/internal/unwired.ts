// Stand-ins with the call signatures of the adapter's internal route handlers. The adapter barrel does not export the
// real handlers yet, and an internal route that cannot authenticate must refuse work rather than accept it.

interface CronRequestDeps {
  readonly secret: string | undefined
  readonly jobs: readonly never[]
}

interface InboundEmailRequestDeps {
  readonly secret: string | undefined
  readonly sink: object
}

function unavailable(): Promise<Response> {
  const error = { code: 'UNAVAILABLE', message: 'Internal route handler is not wired' }
  return Promise.resolve(Response.json({ error }, { status: 503 }))
}

/** Refuses every cron request with 503 until the adapter handler is wired. */
export const handleCronRequest: (request: Request, deps: CronRequestDeps) => Promise<Response> = unavailable

/** Refuses every inbound email request with 503 until the adapter handler is wired. */
export const handleInboundEmailRequest: (request: Request, deps: InboundEmailRequestDeps) => Promise<Response> =
  unavailable

/** Placeholder sink; the stand-in handlers never call it. */
export function createLoggingInboundSink(): object {
  return {}
}
