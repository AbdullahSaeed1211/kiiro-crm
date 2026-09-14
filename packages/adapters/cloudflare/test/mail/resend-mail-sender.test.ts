import { expect, it } from 'vitest'
import { ResendMailSender } from '../../src/mail/resend-mail-sender'
import type { MailMessage } from '@ops/platform'

const message: MailMessage = {
  from: 'Ops <ops@example.test>',
  to: ['person@example.test'],
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello',
}

it('aborts a hung Resend request and maps it to an unavailable error', async () => {
  const result = await new ResendMailSender({
    apiKey: 'key',
    timeoutMs: 1,
    fetcher: (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('timeout', 'AbortError'))
        })
      }),
  }).send(message)
  expect(result).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } })
})
