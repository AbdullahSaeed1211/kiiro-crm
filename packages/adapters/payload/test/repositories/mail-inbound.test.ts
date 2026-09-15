/* eslint-disable max-lines-per-function, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment -- compact scripted Payload fixture. */
import { fixedClock } from '@ops/kernel'
import { createRecordAddressing } from '@ops/module-mail'
import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'
import { createInboundMailSink } from '../../src/repositories/mail-inbound'

const NOW = 1_757_750_400_000
const LEAD = { id: 'lead-1', email: 'sender@example.test', title: 'A lead', owner: 'user-1', assignees: ['user-2'] }

function payloadFor(calls: { method: string; args: Readonly<Record<string, unknown>> }[]) {
  let email: object | undefined
  return {
    find: async (args: Readonly<Record<string, unknown>>) => {
      calls.push({ method: 'find', args })
      if (args['collection'] === 'leads') return { docs: [LEAD] }
      if (args['collection'] === 'emailMessages' && email !== undefined) return { docs: [email] }
      return { docs: [] }
    },
    create: async (args: Readonly<Record<string, unknown>>) => {
      calls.push({ method: 'create', args })
      if (args['collection'] === 'emailMessages') {
        const data = args['data']
        email = { id: 'email-1', ...(typeof data === 'object' && data !== null ? data : {}) }
        return email
      }
      return { id: 'created' }
    },
    update: async (args: Readonly<Record<string, unknown>>) => {
      calls.push({ method: 'update', args })
      return { id: args['id'] }
    },
  } as unknown as Payload
}

describe('createInboundMailSink', () => {
  it('routes a platform-domain record address through the mail domain and announces it', async () => {
    const calls: { method: string; args: Readonly<Record<string, unknown>> }[] = []
    const sink = createInboundMailSink(payloadFor(calls), {
      tenantSecret: 'tenant-secret',
      inboundDomain: 'in.example.test',
      platformDomain: 'example.test',
      tenantSlug: 'tenant',
      timeZone: 'UTC',
      clock: fixedClock(NOW),
    })
    const address = await createRecordAddressing(
      {
        tenantSecret: 'tenant-secret',
        inboundDomain: 'in.example.test',
        platformDomain: 'example.test',
        tenantSlug: 'tenant',
      },
      () => Promise.resolve(undefined),
    ).recordAddress({ type: 'lead', id: 'lead-1' })
    const result = await sink.accept({
      envelopeFrom: 'sender@example.test',
      envelopeTo: address,
      raw: new TextEncoder().encode('Message-ID: <mail-1@example.test>\r\nSubject: Hello\r\n\r\nBody').buffer,
    })

    expect(result).toEqual({ ok: true, value: undefined })
    expect(calls.filter((call) => call.method === 'create').map((call) => call.args)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collection: 'emailMessages',
          data: expect.objectContaining({
            status: 'received',
            recordType: 'lead',
            recordId: 'lead-1',
            messageId: '<mail-1@example.test>',
          }),
          overrideAccess: true,
        }),
        expect.objectContaining({
          collection: 'activity',
          data: expect.objectContaining({ recordType: 'lead', recordId: 'lead-1', verb: 'email.received' }),
        }),
      ]),
    )
    expect(calls.filter((call) => call.args['collection'] === 'notifications')).toHaveLength(4)
  })

  it('quarantines a forged sender while still retaining the inbound message', async () => {
    const calls: { method: string; args: Readonly<Record<string, unknown>> }[] = []
    const sink = createInboundMailSink(payloadFor(calls), {
      tenantSecret: 'tenant-secret',
      inboundDomain: 'in.example.test',
      timeZone: 'UTC',
      clock: fixedClock(NOW),
    })
    const result = await sink.accept({
      envelopeFrom: 'forged@example.test',
      envelopeTo: 'r-not-a-real-token@in.example.test',
      raw: new TextEncoder().encode('Message-ID: <mail-2@example.test>\r\n\r\nBody').buffer,
    })

    expect(result).toEqual({ ok: true, value: undefined })
    expect(
      calls.find((call) => call.method === 'create' && call.args['collection'] === 'emailMessages')?.args['data'],
    ).toMatchObject({
      status: 'quarantined',
    })
    expect(calls.some((call) => call.args['collection'] === 'activity')).toBe(false)
  })
})
