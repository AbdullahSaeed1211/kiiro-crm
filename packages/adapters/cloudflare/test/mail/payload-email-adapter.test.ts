import { expect, it } from 'vitest'
import { CloudflareMailSender } from '../../src/mail/cloudflare-mail-sender'
import { payloadEmailAdapter, PayloadEmailSendError } from '../../src/mail/payload-email-adapter'
import type { EmailServiceMessage } from '../../src/mail/send-email-binding'

it('maps Payload reset email sender through the strict binding and supplies useful plain text', async () => {
  const calls: EmailServiceMessage[] = []
  const sender = new CloudflareMailSender({
    send: (message) => {
      if (typeof message.from === 'string' && message.from.includes('<')) {
        throw Object.assign(new Error('Named sender must use EmailAddress'), { code: 'E_VALIDATION_ERROR' })
      }
      calls.push(message)
      return Promise.resolve({ messageId: 'local-mock-message' })
    },
  })
  const adapter = payloadEmailAdapter({
    sender,
    fromAddress: 'no-reply@notify.example.test',
    fromName: 'Mirch Media',
  })()

  await adapter.sendEmail({
    to: 'owner@example.test',
    subject: 'Reset your password',
    html: '<p><a href="https://crm.example.test/reset-password?token=local-token">Reset your password</a></p><p>Copy: https://crm.example.test/reset-password?token=local-token</p>',
  })

  expect(calls[0]?.from).toEqual({ email: 'no-reply@notify.example.test', name: 'Mirch Media' })
  expect(calls[0]?.to).toEqual(['owner@example.test'])
  expect(calls[0]?.text).toContain('https://crm.example.test/reset-password?token=local-token')
})

it('throws a sanitized typed delivery error with a provider code for operational logging', async () => {
  const adapter = payloadEmailAdapter({
    sender: {
      send: () =>
        Promise.resolve({
          ok: false as const,
          error: {
            code: 'UNAVAILABLE' as const,
            message: 'Email Service send failed',
            details: { providerCode: 'E_VALIDATION_ERROR' },
          },
        }),
    },
    fromAddress: 'no-reply@notify.example.test',
    fromName: 'Mirch Media',
  })()

  await expect(adapter.sendEmail({ to: 'owner@example.test', subject: 'Reset', html: 'reset' })).rejects.toMatchObject({
    name: PayloadEmailSendError.name,
    code: 'UNAVAILABLE',
    providerCode: 'E_VALIDATION_ERROR',
    message: 'Transactional email delivery failed',
  })
})
