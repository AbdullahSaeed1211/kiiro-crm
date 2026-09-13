/** Internal routes the Worker entry forwards scheduled and email events to (spec §12). */
export const INTERNAL_ROUTES = {
  cron: '/api/v1/internal/cron',
  inboundEmail: '/api/v1/internal/email/inbound',
} as const

/** Header carrying the tenant's internal secret on internal routes. */
export const INTERNAL_SECRET_HEADER = 'x-internal-secret'

/** Anything that can receive a request, such as a service binding. */
export interface RequestTarget {
  fetch(request: Request): Promise<Response>
}

/** Worker bindings used to forward events to the tenant's own internal routes. */
export interface InternalForwardEnv {
  readonly WORKER_SELF_REFERENCE: RequestTarget
  readonly INTERNAL_SECRET: string
  readonly APP_ORIGIN: string
}

/** The parts of an Email Routing message the inbound bridge uses. */
export interface InboundEmailMessage {
  readonly from: string
  readonly to: string
  readonly raw: ReadableStream<Uint8Array>
  readonly rawSize: number
  setReject(reason: string): void
}
