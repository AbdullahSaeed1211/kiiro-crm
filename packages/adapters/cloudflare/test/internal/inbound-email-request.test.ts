import { createJsonLogger, domainError, err, ok, type Result } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { INTERNAL_ROUTES, INTERNAL_SECRET_HEADER } from '../../src/contracts/worker'
import { handleInboundEmailRequest } from '../../src/internal/inbound-email-request'
import type { InboundEmail, InboundEmailSink } from '../../src/mail/inbound-sink'
import { MAX_INBOUND_BYTES } from '../../src/worker/bridge-inbound-email'

const SECRET = 'internal-test-secret'
const FROM = 'sender@example.test'
const TO = 'r-token@in.example.test'
const MIME = 'Subject: hello\r\n\r\nbody'

function recordingSink(result: Result<void> = ok(undefined)) {
  const accepted: InboundEmail[] = []
  const sink: InboundEmailSink = {
    accept: (email) => {
      accepted.push(email)
      return Promise.resolve(result)
    },
  }
  return { sink, accepted }
}

function inboundRequest(body: BodyInit, headers: Record<string, string> = {}): Request {
  const allHeaders = { [INTERNAL_SECRET_HEADER]: SECRET, 'x-envelope-from': FROM, 'x-envelope-to': TO, ...headers }
  return new Request(`https://tenant.example.test${INTERNAL_ROUTES.inboundEmail}`, {
    method: 'POST',
    body,
    headers: allHeaders,
  })
}

describe('handleInboundEmailRequest', () => {
  it('hands the raw bytes and envelope to the sink and responds accepted', async () => {
    const { sink, accepted } = recordingSink()
    const response = await handleInboundEmailRequest(inboundRequest(MIME), { secret: SECRET, sink })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'accepted' })
    expect(accepted.map((email) => [email.envelopeFrom, email.envelopeTo])).toEqual([[FROM, TO]])
    expect(new TextDecoder().decode(accepted[0]?.raw)).toBe(MIME)
  })

  it('refuses a wrong secret with 401 before reading the message', async () => {
    const { sink, accepted } = recordingSink()
    const request = inboundRequest(MIME, { [INTERNAL_SECRET_HEADER]: 'wrong' })
    expect((await handleInboundEmailRequest(request, { secret: SECRET, sink })).status).toBe(401)
    expect(accepted).toEqual([])
  })
})

describe('handleInboundEmailRequest refusals', () => {
  it('rejects a declared content-length over the limit with 413', async () => {
    const { sink, accepted } = recordingSink()
    const request = inboundRequest(MIME, { 'content-length': String(MAX_INBOUND_BYTES + 1) })
    const response = await handleInboundEmailRequest(request, { secret: SECRET, sink })
    expect(response.status).toBe(413)
    expect(accepted).toEqual([])
  })

  it('rejects an actual body over the limit with 413 when the length is not declared', async () => {
    const { sink, accepted } = recordingSink()
    const request = inboundRequest(new Uint8Array(MAX_INBOUND_BYTES + 1))
    expect(request.headers.get('content-length')).toBeNull()
    expect((await handleInboundEmailRequest(request, { secret: SECRET, sink })).status).toBe(413)
    expect(accepted).toEqual([])
  })

  it.each(['x-envelope-from', 'x-envelope-to'])('rejects a request without %s with 400', async (header) => {
    const { sink } = recordingSink()
    const response = await handleInboundEmailRequest(inboundRequest(MIME, { [header]: '' }), { secret: SECRET, sink })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION' } })
  })

  it('maps a sink error to its HTTP status and logs only the code', async () => {
    const lines: string[] = []
    const logger = createJsonLogger((line) => {
      lines.push(line)
    })
    const { sink } = recordingSink(err(domainError('UNAVAILABLE', 'database busy')))
    const response = await handleInboundEmailRequest(inboundRequest(MIME), { secret: SECRET, sink, logger })
    expect(response.status).toBe(503)
    expect(lines).toEqual([JSON.stringify({ level: 'error', msg: 'email.inbound_sink_failed', code: 'UNAVAILABLE' })])
  })
})
