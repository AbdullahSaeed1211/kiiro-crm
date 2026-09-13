import { describe, expect, it } from 'vitest'
import { bridgeInboundEmail, dispatchCron, INTERNAL_SECRET_HEADER, MAX_INBOUND_BYTES } from '../../src/index'

function recordingEnv(status = 200) {
  const requests: Request[] = []
  const env = {
    APP_ORIGIN: 'https://tenant.example.test',
    INTERNAL_SECRET: 'internal-test-secret',
    WORKER_SELF_REFERENCE: {
      fetch: (request: Request) => {
        requests.push(request)
        return Promise.resolve(new Response(null, { status }))
      },
    },
  }
  return { env, requests }
}

function inboundMessage(text: string, rawSize = text.length) {
  const rejections: string[] = []
  const message = {
    from: 'sender@example.test',
    to: 'r-token@in.example.test',
    raw: new Blob([text]).stream(),
    rawSize,
    setReject: (reason: string) => {
      rejections.push(reason)
    },
  }
  return { message, rejections }
}

describe('dispatchCron', () => {
  it('posts the scheduled time to the internal cron route with the internal secret', async () => {
    const { env, requests } = recordingEnv()
    await dispatchCron(env, 1_700_000_000_000)
    const [request] = requests
    expect(request?.url).toBe('https://tenant.example.test/api/v1/internal/cron')
    expect(request?.headers.get(INTERNAL_SECRET_HEADER)).toBe('internal-test-secret')
    expect(await request?.json()).toEqual({ scheduledTime: 1_700_000_000_000 })
  })
})

describe('bridgeInboundEmail', () => {
  it('forwards the raw message and envelope to the internal inbound route', async () => {
    const { env, requests } = recordingEnv()
    const { message, rejections } = inboundMessage('Subject: hello\r\n\r\nbody')
    await bridgeInboundEmail(env, message)
    const [request] = requests
    expect(request?.url).toBe('https://tenant.example.test/api/v1/internal/email/inbound')
    expect(request?.headers.get('x-envelope-from')).toBe('sender@example.test')
    expect(request?.headers.get('x-envelope-to')).toBe('r-token@in.example.test')
    expect(await request?.text()).toBe('Subject: hello\r\n\r\nbody')
    expect(rejections).toEqual([])
  })

  it('rejects oversized messages without forwarding them', async () => {
    const { env, requests } = recordingEnv()
    const { message, rejections } = inboundMessage('x', MAX_INBOUND_BYTES + 1)
    await bridgeInboundEmail(env, message)
    expect(requests).toHaveLength(0)
    expect(rejections).toEqual(['Message too large'])
  })

  it('rejects the message when the internal route fails', async () => {
    const { env } = recordingEnv(500)
    const { message, rejections } = inboundMessage('Subject: hello\r\n\r\nbody')
    await bridgeInboundEmail(env, message)
    expect(rejections).toEqual(['Unable to accept message'])
  })
})
