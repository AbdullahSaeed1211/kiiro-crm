import { createHash } from 'node:crypto'
import { fixedClock } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { createEmailMessageSink } from '../../src/repositories'
import { parseHeaders } from '../../src/repositories/email-headers'
import { fakePayload, type Handlers } from './fake-payload'

const NOW = 1_757_750_400_000
const ENVELOPE = { envelopeFrom: 'sender@example.test', envelopeTo: 'inbox@in.example.test' }
const MESSAGE_ID = '<m1@example.test>'
const ACCEPTED = { ok: true, value: undefined }

function accept(raw: string, handlers: Handlers = {}) {
  const { payload, calls } = fakePayload(handlers)
  const email = { ...ENVELOPE, raw: new TextEncoder().encode(raw).buffer }
  return { result: createEmailMessageSink(payload, fixedClock(NOW)).accept(email), calls }
}

describe('parseHeaders', () => {
  it('unfolds continuation lines, lower-cases names, keeps the first value and stops at the body', () => {
    const raw = 'Subject: Quarterly\r\n\treport\r\n  draft\r\nsubject: second\r\nX-Empty:\r\n\r\nX-Body: not a header'
    const headers = parseHeaders(raw)
    expect(headers.get('subject')).toBe('Quarterly\treport  draft')
    expect(headers.get('x-empty')).toBe('')
    expect(headers.has('x-body')).toBe(false)
  })

  it('accepts bare line feeds and ignores lines without a name', () => {
    const headers = parseHeaders(`From: a@example.test\n: nameless\nno colon\nMessage-ID: ${MESSAGE_ID}\n\nbody`)
    expect([...headers]).toEqual([
      ['from', 'a@example.test'],
      ['message-id', MESSAGE_ID],
    ])
  })
})

describe('createEmailMessageSink storage', () => {
  it('stores an inbound message as system work', async () => {
    const raw = `Message-ID: ${MESSAGE_ID}\r\nSubject: Hello\r\n there\r\n\r\nBody text`
    const { result, calls } = accept(raw)
    expect(await result).toEqual(ACCEPTED)
    expect(calls.map((call) => call.args)).toMatchObject([
      { collection: 'emailMessages', where: { messageId: { equals: MESSAGE_ID } }, overrideAccess: true },
      {
        collection: 'emailMessages',
        overrideAccess: true,
        data: {
          direction: 'inbound',
          status: 'received',
          messageId: MESSAGE_ID,
          from: ENVELOPE.envelopeFrom,
          to: [ENVELOPE.envelopeTo],
          subject: 'Hello there',
          textBody: raw,
          occurredAt: NOW,
        },
      },
    ])
  })

  it('falls back to the SHA-256 of the raw bytes without a Message-ID and truncates the body to 200 KB', async () => {
    const raw = `Subject: Large\r\n\r\n${'x'.repeat(250_000)}`
    const { result, calls } = accept(raw)
    expect(await result).toEqual(ACCEPTED)
    expect(calls[1]?.args['data']).toMatchObject({
      messageId: `sha256:${createHash('sha256').update(raw).digest('hex')}`,
      textBody: raw.slice(0, 200_000),
    })
  })
})

describe('createEmailMessageSink repeats and failures', () => {
  it('accepts a repeated Message-ID without a second document', async () => {
    const { result, calls } = accept(`Message-ID: ${MESSAGE_ID}\r\n\r\n`, { find: () => ({ docs: [{ id: 'e1' }] }) })
    expect(await result).toEqual(ACCEPTED)
    expect(calls.map((call) => call.method)).toEqual(['find'])
  })

  it('returns INTERNAL without detail when storage fails', async () => {
    const { result } = accept('Subject: x\r\n\r\n', {
      create: () => {
        throw new Error('sender@example.test rejected')
      },
    })
    expect(await result).toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'inbound message could not be stored' },
    })
  })
})
