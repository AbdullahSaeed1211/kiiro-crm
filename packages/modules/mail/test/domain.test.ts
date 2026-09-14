import { expect, it } from 'vitest'
import { createRecordAddressing, parseEmail, receiveInboundEmail, renderTemplate } from '../src'
import type { EmailMessage, MailStore } from '../src'

const SENDER = 'person@example.test'

function mailStore(existing?: EmailMessage): MailStore {
  const messages: EmailMessage[] = existing === undefined ? [] : [existing]
  return {
    findMessageByMessageId: (id) => Promise.resolve(messages.find((message) => message.messageId === id)),
    createMessage: (message) => {
      const saved = { id: `mail-${String(messages.length + 1)}`, ...message }
      messages.push(saved)
      return Promise.resolve(saved)
    },
    findRecordByAddressToken: (token) =>
      Promise.resolve(token === 'known' ? { type: 'lead', id: 'lead-1' } : undefined),
    findIntakeFormByAlias: () => Promise.resolve(undefined),
    senderMatchesRecord: (sender) => Promise.resolve(sender === SENDER),
    senderMatchesActiveUser: () => Promise.resolve(false),
    addActivity: () => Promise.resolve(undefined),
    notify: () => Promise.resolve(undefined),
    releaseMessage: () => Promise.resolve({ ok: true as const, value: undefined }),
  }
}

it('creates deterministic tenant-scoped record addresses', async () => {
  const addressing = createRecordAddressing({ tenantSecret: 'tenant-secret', inboundDomain: 'in.example.test' }, () =>
    Promise.resolve(undefined),
  )
  const first = await addressing.recordAddress({ type: 'lead', id: 'lead-1' })
  const second = await addressing.recordAddress({ type: 'lead', id: 'lead-1' })
  expect(first).toBe(second)
  expect(first).toMatch(/^r-[A-Z2-7]{16}@in\.example\.test$/)
})

it('quarantines unknown addresses and accepts trusted record mail', async () => {
  const raw = new TextEncoder().encode(
    'Message-ID: <m1@example.test>\r\nFrom: person@example.test\r\nSubject: Hello\r\n\r\nBody',
  ).buffer
  const unknown = await receiveInboundEmail({
    store: mailStore(),
    addressing: { recordAddress: () => Promise.resolve(''), resolveRecord: () => Promise.resolve(undefined) },
    now: 1,
    envelopeFrom: SENDER,
    envelopeTo: 'unknown@example.test',
    raw,
  })
  expect(unknown).toMatchObject({ ok: true, value: { status: 'quarantined' } })
  const accepted = await receiveInboundEmail({
    store: mailStore(),
    addressing: { recordAddress: () => Promise.resolve(''), resolveRecord: () => Promise.resolve(undefined) },
    now: 1,
    envelopeFrom: SENDER,
    envelopeTo: 'r-known@example.test',
    raw,
  })
  expect(accepted).toMatchObject({
    ok: true,
    value: { status: 'received', destination: { kind: 'record', record: { id: 'lead-1' } } },
  })
})

it('renders escaped HTML and always includes text', () => {
  const rendered = renderTemplate({
    template: 'emailReceived',
    recipient: 'person@example.test',
    appName: 'Ops',
    title: '<unsafe>',
    link: 'https://example.test/r',
  })
  expect(rendered.html).toContain('&lt;unsafe&gt;')
  expect(rendered.html).not.toContain('<unsafe>')
  expect(rendered.text).toContain('https://example.test/r')
  expect(parseEmail(new TextEncoder().encode('Subject: Test\r\n\r\nBody').buffer).textBody).toBe('Body')
})
