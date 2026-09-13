import type { MailMessage } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { CloudflareMailSender } from '../../src/mail/cloudflare-mail-sender'
import type { EmailServiceMessage, EmailServiceResult } from '../../src/mail/send-email-binding'
import { isSenderNotVerified } from '../../src/mail/send-errors'

const MESSAGE: MailMessage = {
  from: 'Workspace <no-reply@notify.example.test>',
  to: ['person@example.test'],
  subject: 'Due soon: Item',
  html: '<p>Due soon</p>',
  text: 'Due soon',
}

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
  it('sends the message through the binding and returns the message id', async () => {
    const { sender, calls } = senderWith(() => Promise.resolve({ messageId: 'msg-1' }))
    const headers = { 'X-Entity-Ref': 'r-1' }
    const result = await sender.send({ ...MESSAGE, replyTo: 'r-abc@in.example.test', headers })
    expect(result).toEqual({ ok: true, value: { messageId: 'msg-1' } })
    expect(calls).toEqual([{ ...MESSAGE, replyTo: 'r-abc@in.example.test', headers }])
  })

  it('omits reply-to and headers when the message has none', async () => {
    const { sender, calls } = senderWith(() => Promise.resolve({ messageId: 'msg-2' }))
    await sender.send(MESSAGE)
    expect(calls[0]).toStrictEqual(MESSAGE)
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
