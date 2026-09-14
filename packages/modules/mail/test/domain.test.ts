/* eslint-disable @typescript-eslint/require-await -- failure-boundary fixtures deliberately await injected retries. */
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
    addActivityIfAbsent: () => Promise.resolve('created' as const),
    notifyIfAbsent: () => Promise.resolve('created' as const),
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

it('renders escaped HTML and always includes text', async () => {
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
  await expect(parseEmail(new TextEncoder().encode('Subject: Test\r\n\r\nBody').buffer)).resolves.toMatchObject({
    textBody: 'Body',
  })
})

it('parses display names, encoded headers, multipart transfer encodings and attachments', async () => {
  const raw = [
    'Message-ID: <mime@example.test>',
    'From: Ada Lovelace <ada@example.test>',
    'To: Team <team@example.test>, Bob <bob@example.test>',
    'Subject: =?UTF-8?B?SGVsbG8g4pyT?=',
    'Content-Type: multipart/mixed; boundary="boundary"',
    '',
    '--boundary',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    'Hello=20world=21',
    '--boundary',
    'Content-Type: text/plain',
    'Content-Disposition: attachment; filename="note.txt"',
    'Content-Transfer-Encoding: base64',
    '',
    'SGVsbG8=',
    '--boundary--',
  ].join('\r\n')
  const parsed = await parseEmail(new TextEncoder().encode(raw).buffer)
  expect(parsed).toMatchObject({
    from: 'ada@example.test',
    to: ['team@example.test', 'bob@example.test'],
    subject: 'Hello ✓',
    textBody: 'Hello world!',
  })
  expect(parsed.attachments).toMatchObject([{ filename: 'note.txt', contentType: 'text/plain' }])
  expect(new TextDecoder().decode(parsed.attachments?.[0]?.bytes)).toBe('Hello')
})

it('uses a full-message SHA-256 fallback identifier', async () => {
  const first = await parseEmail(new TextEncoder().encode('Subject: Same\r\n\r\nfirst').buffer)
  const second = await parseEmail(new TextEncoder().encode('Subject: Same\r\n\r\nsecond').buffer)
  expect(first.messageId).toMatch(/^sha256:[0-9a-f]{64}$/)
  expect(second.messageId).toMatch(/^sha256:[0-9a-f]{64}$/)
  expect(first.messageId).not.toBe(second.messageId)
})

it('routes an intake alias through the explicit intake submission port', async () => {
  const base = mailStore()
  const store: MailStore = {
    ...base,
    findIntakeFormByAlias: () => Promise.resolve({ id: 'form-1', active: true }),
  }
  const result = await receiveInboundEmail({
    store,
    intake: {
      submit: () =>
        Promise.resolve({
          ok: true as const,
          value: { status: 'accepted' as const, recordRef: { type: 'lead', id: 'lead-2' } },
        }),
    },
    addressing: { recordAddress: () => Promise.resolve(''), resolveRecord: () => Promise.resolve(undefined) },
    now: 1,
    envelopeFrom: SENDER,
    envelopeTo: 'leads@example.test',
    raw: new TextEncoder().encode('Message-ID: <intake@example.test>\r\nSubject: New\r\n\r\nHello').buffer,
  })
  expect(result).toMatchObject({
    ok: true,
    value: { status: 'received', destination: { kind: 'intake', formId: 'form-1' } },
  })
})

it('retries missing inbound side effects after a failure at either boundary', async () => {
  for (const boundary of ['activity', 'notification'] as const) {
    let failures = 1
    let activities = 0
    let notifications = 0
    const base = mailStore()
    const store: MailStore = {
      ...base,
      addActivityIfAbsent: async () => {
        activities += 1
        if (boundary === 'activity' && failures > 0) {
          failures -= 1
          throw new Error('activity failed')
        }
        return 'created'
      },
      notifyIfAbsent: async () => {
        notifications += 1
        if (boundary === 'notification' && failures > 0) {
          failures -= 1
          throw new Error('notification failed')
        }
        return 'created'
      },
    }
    const input = {
      store,
      addressing: { recordAddress: () => Promise.resolve(''), resolveRecord: () => Promise.resolve(undefined) },
      now: 1,
      envelopeFrom: SENDER,
      envelopeTo: 'r-known@example.test',
      raw: new TextEncoder().encode(`Message-ID: <retry-${boundary}@example.test>\r\n\r\nHello`).buffer,
    }
    await expect(receiveInboundEmail(input)).rejects.toThrow(boundary)
    await expect(receiveInboundEmail(input)).resolves.toMatchObject({ ok: true, value: { status: 'duplicate' } })
    expect(activities).toBeGreaterThanOrEqual(1)
    expect(notifications).toBeGreaterThanOrEqual(1)
  }
})
