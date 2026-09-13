import { createJsonLogger } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { ConsoleMailSender } from '../../src/mail/console-mail-sender'
import { createLoggingInboundSink } from '../../src/mail/logging-inbound-sink'

const ADDRESS = 'person@example.test'

function capture() {
  const lines: string[] = []
  const logger = createJsonLogger((line) => {
    lines.push(line)
  })
  return { lines, logger }
}

describe('ConsoleMailSender', () => {
  it('logs only the recipient count and subject and returns a generated id', async () => {
    const { lines, logger } = capture()
    const message = {
      from: `W <${ADDRESS}>`,
      to: [ADDRESS, 'b@example.test'],
      subject: 'Hi',
      html: '<b>x</b>',
      text: 'x',
    }
    const result = await new ConsoleMailSender(logger).send(message)
    expect(result.ok).toBe(true)
    const messageId = result.ok ? result.value.messageId : ''
    expect(messageId).toMatch(/^[0-9a-f-]{36}$/)
    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      { level: 'info', msg: 'mail.console_send', messageId, recipients: 2, subject: 'Hi' },
    ])
  })
})

describe('createLoggingInboundSink', () => {
  it('accepts the message and logs only its size and SHA-256', async () => {
    const { lines, logger } = capture()
    const raw = new TextEncoder().encode('abc').buffer
    const result = await createLoggingInboundSink(logger).accept({ envelopeFrom: ADDRESS, envelopeTo: ADDRESS, raw })
    expect(result).toEqual({ ok: true, value: undefined })
    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      {
        level: 'info',
        msg: 'email.inbound_received',
        bytes: 3,
        sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      },
    ])
  })
})
