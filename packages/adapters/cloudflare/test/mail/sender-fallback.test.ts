import { domainError, err, ok, type Result } from '@ops/kernel'
import type { MailMessage, MailSender } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { mapSendError } from '../../src/mail/send-errors'
import { withPlatformSenderFallback } from '../../src/mail/sender-fallback'

const PLATFORM_FROM = 'Workspace <no-reply@notify.example.test>'
const TENANT_FROM = 'Studio <hello@studio.example.test>'
const MESSAGE: MailMessage = { from: TENANT_FROM, to: ['person@example.test'], subject: 's', html: 'h', text: 't' }
const notVerified = err(mapSendError({ code: 'E_SENDER_NOT_VERIFIED' }))

function scriptedSender(results: readonly Result<{ readonly messageId: string }>[]) {
  const froms: string[] = []
  const sender: MailSender = {
    send: (message) => {
      froms.push(message.from)
      return Promise.resolve(results[froms.length - 1] ?? ok({ messageId: 'unexpected' }))
    },
  }
  return { sender, froms }
}

describe('withPlatformSenderFallback', () => {
  it('retries once from the platform sender after reporting the unverified sender', async () => {
    const { sender, froms } = scriptedSender([notVerified, ok({ messageId: 'msg-1' })])
    let reported = 0
    const onSenderNotVerified = () => {
      reported += 1
      return Promise.resolve()
    }
    const wrapped = withPlatformSenderFallback(sender, { platformFrom: PLATFORM_FROM, onSenderNotVerified })
    expect(await wrapped.send(MESSAGE)).toEqual(ok({ messageId: 'msg-1' }))
    expect(froms).toEqual([TENANT_FROM, PLATFORM_FROM])
    expect(reported).toBe(1)
  })

  it('returns the retry error when the platform sender fails too', async () => {
    const { sender, froms } = scriptedSender([notVerified, notVerified])
    const wrapped = withPlatformSenderFallback(sender, { platformFrom: PLATFORM_FROM })
    expect(await wrapped.send(MESSAGE)).toEqual(notVerified)
    expect(froms).toHaveLength(2)
  })

  it('does not retry other errors', async () => {
    const rateLimited = err(domainError('RATE_LIMITED', 'slow down'))
    const { sender, froms } = scriptedSender([rateLimited])
    const wrapped = withPlatformSenderFallback(sender, { platformFrom: PLATFORM_FROM })
    expect(await wrapped.send(MESSAGE)).toEqual(rateLimited)
    expect(froms).toEqual([TENANT_FROM])
  })

  it('does not retry a message already sent from the platform sender', async () => {
    const { sender, froms } = scriptedSender([notVerified])
    const wrapped = withPlatformSenderFallback(sender, { platformFrom: PLATFORM_FROM })
    expect(await wrapped.send({ ...MESSAGE, from: PLATFORM_FROM })).toEqual(notVerified)
    expect(froms).toEqual([PLATFORM_FROM])
  })
})
