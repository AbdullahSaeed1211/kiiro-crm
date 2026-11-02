import type { MailMessage } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { CloudflareMailSender } from '../../src/mail/cloudflare-mail-sender'
import type { EmailServiceMessage, EmailServiceResult } from '../../src/mail/send-email-binding'
import { isSenderNotVerified } from '../../src/mail/send-errors'

/* eslint-disable max-lines-per-function -- wire mapping cases intentionally remain together. */

const MESSAGE: MailMessage = {
  from: 'Workspace <no-reply@notify.example.test>',
  to: ['person@example.test'],
  subject: 'Due soon: Item',
  html: '<p>Due soon</p>',
  text: 'Due soon',
}
const MAILBOX = 'no-reply@notify.example.test'

function codedError(code: string): Error {
  return Object.assign(new Error('Sender domain example.test is not verified for person@example.test'), { code })
}

function senderWith(send: (message: EmailServiceMessage) => Promise<EmailServiceResult>) {
  const calls: EmailServiceMessage[] = []
  const sender = new CloudflareMailSender({
    send: (message) => {
      calls.push(message)
      return send(message)
    },
  })
  return { sender, calls }
}

describe('CloudflareMailSender', () => {
  it('sends display-name senders using the structured EmailAddress binding form', async () => {
    const { sender, calls } = senderWith((message) => {
      if (typeof message.from === 'string' && message.from.includes('<')) {
        return Promise.reject(
          Object.assign(new Error('Named sender must use EmailAddress'), { code: 'E_VALIDATION_ERROR' }),
        )
      }
      return Promise.resolve({ messageId: 'msg-named-sender' })
    })
    const result = await sender.send(MESSAGE)
    expect(result).toEqual({ ok: true, value: { messageId: 'msg-named-sender' } })
    expect(calls[0]?.from).toEqual({ email: MAILBOX, name: 'Workspace' })
  })

  it('sends the message through the binding and returns the message id', async () => {
    const { sender, calls } = senderWith(() => Promise.resolve({ messageId: 'msg-1' }))
    const headers = { 'X-Entity-Ref': 'r-1' }
    const result = await sender.send({ ...MESSAGE, replyTo: 'r-abc@in.example.test', headers })
    expect(result).toEqual({ ok: true, value: { messageId: 'msg-1' } })
    expect(calls).toEqual([
      {
        ...MESSAGE,
        from: { email: MAILBOX, name: 'Workspace' },
        replyTo: 'r-abc@in.example.test',
        headers,
      },
    ])
  })

  it('omits reply-to and headers when the message has none', async () => {
    const { sender, calls } = senderWith(() => Promise.resolve({ messageId: 'msg-2' }))
    await sender.send(MESSAGE)
    expect(calls[0]).toStrictEqual({
      ...MESSAGE,
      from: { email: MAILBOX, name: 'Workspace' },
    })
  })

  it('keeps plain sender addresses as strings', async () => {
    const { sender, calls } = senderWith(() => Promise.resolve({ messageId: 'msg-plain-sender' }))
    await sender.send({ ...MESSAGE, from: MAILBOX })
    expect(calls[0]?.from).toBe(MAILBOX)
  })

  it('rejects malformed sender addresses before calling the binding', async () => {
    const { sender, calls } = senderWith(() => Promise.resolve({ messageId: 'unexpected' }))
    const result = await sender.send({ ...MESSAGE, from: 'Mirch Media <not-an-email>' })
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(calls).toHaveLength(0)
  })

  it('passes base64 attachments through to Email Service', async () => {
    const { sender, calls } = senderWith(() => Promise.resolve({ messageId: 'msg-attachment' }))
    await sender.send({
      ...MESSAGE,
      attachments: [{ filename: 'brief.pdf', contentType: 'application/pdf', content: 'JVBERi0xLjQ=' }],
    })
    expect(calls[0]?.attachments).toEqual([
      { filename: 'brief.pdf', type: 'application/pdf', content: 'JVBERi0xLjQ=', disposition: 'attachment' },
    ])
  })

  it.each([
    ['E_RATE_LIMIT_EXCEEDED', 'RATE_LIMITED'],
    ['E_VALIDATION_ERROR', 'VALIDATION'],
    ['E_SENDER_NOT_VERIFIED', 'VALIDATION'],
    ['E_DAILY_LIMIT_EXCEEDED', 'UNAVAILABLE'],
    ['E_INTERNAL_SERVER_ERROR', 'UNAVAILABLE'],
  ])('maps %s to %s without copying the provider message', async (providerCode, code) => {
    const { sender } = senderWith(() => Promise.reject(codedError(providerCode)))
    const result = await sender.send(MESSAGE)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatchObject({ code, details: { providerCode } })
    expect(result.error.message).not.toContain('@')
    expect(isSenderNotVerified(result.error)).toBe(providerCode === 'E_SENDER_NOT_VERIFIED')
  })

  it('maps a failure without an error code to UNAVAILABLE', async () => {
    const { sender } = senderWith(() => Promise.reject(new Error('socket closed')))
    expect(await sender.send(MESSAGE)).toEqual({
      ok: false,
      error: { code: 'UNAVAILABLE', message: 'Email Service send failed (no error code)' },
    })
  })
})
