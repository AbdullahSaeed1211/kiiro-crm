import { describe, expect, it, vi } from 'vitest'
import { dispatchVoiceQueue } from '../../src/worker/voice-queue'

function message(body: unknown) {
  return { id: 'message-1', body, attempts: 1, ack: vi.fn(), retry: vi.fn() }
}

function forwardingEnv(fetch: (request: Request) => Promise<Response>) {
  return {
    APP_ORIGIN: 'https://workspace.example.test',
    INTERNAL_SECRET: 'queue-test-secret',
    WORKER_SELF_REFERENCE: { fetch },
  }
}

describe('voice queue delivery', () => {
  it('keeps a failed processing job available for retry rather than losing the side effect', async () => {
    const job = message({ kind: 'reconcile', callId: 'call-1' })
    const env = forwardingEnv(() => Promise.resolve(new Response(null, { status: 503 })))
    await dispatchVoiceQueue({ messages: [job] }, env)
    expect(job.ack).not.toHaveBeenCalled()
    expect(job.retry).toHaveBeenCalledOnce()
  })

  it('acknowledges only after the authenticated internal processor completes', async () => {
    const job = message({ kind: 'events' })
    const env = forwardingEnv(async (request) => {
      expect(job.ack).not.toHaveBeenCalled()
      expect(request.headers.get('x-internal-secret')).toBe('queue-test-secret')
      expect(new URL(request.url).pathname).toBe('/api/v1/internal/voice/process')
      expect(await request.json()).toEqual({ kind: 'events' })
      return new Response(null, { status: 204 })
    })
    await dispatchVoiceQueue({ messages: [job] }, env)
    expect(job.ack).toHaveBeenCalledOnce()
    expect(job.retry).not.toHaveBeenCalled()
  })
})
