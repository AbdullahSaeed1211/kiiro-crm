import { domainError, err, ok } from '@ops/kernel'
import type { MailMessage, MailSender } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { payloadEmailAdapter } from '../../src/mail/payload-email-adapter'

function recordingSender(fail = false) {
  const sent: MailMessage[] = []
  const sender: MailSender = {
    send: (message) => {
      sent.push(message)
      return Promise.resolve(fail ? err(domainError('UNAVAILABLE', 'down')) : ok({ messageId: 'm-1' }))
    },
  }
  return { sender, sent }
}

const options = { fromAddress: 'no-reply@example.test', fromName: 'Workspace' }

describe('payloadEmailAdapter', () => {
  it('maps Payload messages, including address objects, to the sender', async () => {
    const { sender, sent } = recordingSender()
    const adapter = payloadEmailAdapter({ ...options, sender })()
    const result = await adapter.sendEmail({
      to: ['a@example.test', { address: 'b@example.test' }],
      subject: 'Hi',
      html: '<p>x</p>',
      text: 'x',
    })
    expect(result).toEqual({ messageId: 'm-1' })
    expect(sent).toEqual([
      {
        from: 'Workspace <no-reply@example.test>',
        to: ['a@example.test', 'b@example.test'],
        subject: 'Hi',
        html: '<p>x</p>',
        text: 'x',
      },
    ])
    expect(adapter.defaultFromAddress).toBe('no-reply@example.test')
  })

  it('throws when the sender fails', async () => {
    const { sender } = recordingSender(true)
    const adapter = payloadEmailAdapter({ ...options, sender })()
    await expect(adapter.sendEmail({ to: 'a@example.test' })).rejects.toThrow('UNAVAILABLE')
  })
})
