import { createJsonLogger, domainError, type Logger } from '@ops/kernel'
import type { InboundEmail, InboundEmailSink } from '../mail/inbound-sink'
import { MAX_INBOUND_BYTES } from '../worker/bridge-inbound-email'
import { rejectUnauthorized } from './internal-secret'
import { readBodyWithin } from './read-body'
import { domainErrorResponse, jsonError } from './responses'

/** What the internal inbound email route passes from its composition root. */
export interface InboundEmailRequestDeps {
  /** The tenant's `INTERNAL_SECRET`; unset means every request is refused. */
  readonly secret: string | undefined
  readonly sink: InboundEmailSink
  readonly logger?: Logger
}

function tooLarge(): Response {
  return jsonError(413, { code: 'PAYLOAD_TOO_LARGE', message: `Message exceeds ${String(MAX_INBOUND_BYTES)} bytes` })
}

// A missing or malformed content-length is not trusted either way; the capped read below decides.
function declaresTooLarge(headers: Headers): boolean {
  return Number(headers.get('content-length')) > MAX_INBOUND_BYTES
}

function envelopeOf(headers: Headers): Omit<InboundEmail, 'raw'> | undefined {
  const envelopeFrom = headers.get('x-envelope-from') ?? ''
  const envelopeTo = headers.get('x-envelope-to') ?? ''
  return envelopeFrom === '' || envelopeTo === '' ? undefined : { envelopeFrom, envelopeTo }
}

/**
 * Handles `POST /api/v1/internal/email/inbound` (spec §12, §14.4): authenticates, enforces the 25 MiB limit and hands
 * the raw message with its envelope to the sink. Nothing from the envelope or body is logged.
 * @returns 200 `{ status: 'accepted' }`; 401 `UNAUTHORIZED` on a missing or wrong internal secret;
 *   413 `PAYLOAD_TOO_LARGE` when the declared or actual body exceeds `MAX_INBOUND_BYTES`;
 *   400 `VALIDATION` without both envelope headers; the §12.1 status of the sink's error code otherwise.
 */
export async function handleInboundEmailRequest(request: Request, deps: InboundEmailRequestDeps): Promise<Response> {
  const unauthorized = await rejectUnauthorized(request, deps.secret)
  if (unauthorized !== undefined) return unauthorized
  if (declaresTooLarge(request.headers)) return tooLarge()
  const envelope = envelopeOf(request.headers)
  if (envelope === undefined) {
    return domainErrorResponse(domainError('VALIDATION', 'x-envelope-from and x-envelope-to are required'))
  }
  const raw = await readBodyWithin(request, MAX_INBOUND_BYTES)
  if (raw === undefined) return tooLarge()
  const accepted = await deps.sink.accept({ ...envelope, raw })
  if (accepted.ok) return Response.json({ status: 'accepted' })
  const logger = deps.logger ?? createJsonLogger()
  logger.error('email.inbound_sink_failed', { code: accepted.error.code })
  return domainErrorResponse(accepted.error)
}
