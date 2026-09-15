/* eslint-disable @typescript-eslint/require-await -- in-memory registry implements the async production contract. */
import { describe, expect, it } from 'vitest'
import {
  canRetryOperatorRun,
  previewOperatorRun,
  redactOperatorError,
  submitOperatorRun,
  type OperatorRegistry,
  type OperatorRun,
} from '../../../scripts/lib/provision/operator'

const tenant = {
  slug: 'northstar',
  displayName: 'Northstar',
  hostType: 'workers_dev',
  template: 'agency',
  timezone: 'UTC',
  locale: 'en',
  currency: 'USD',
  owner: { email: 'owner@example.test', name: 'Owner' },
  email: { fromName: 'Northstar', fromAddress: 'no-reply@example.test', inboundDomain: 'in.example.test' },
  d1: { name: 'northstar' },
  r2: { bucket: 'northstar' },
  rateLimitNamespaces: { intake: '1', auth: '2' },
  intake: { allowedOrigins: ['https://example.test'], turnstileHostnames: ['example.test'] },
  deployOrder: 0,
}

describe('operator provisioning boundary', () => {
  it('previews, deduplicates and redacts without contacting Cloudflare', async () => {
    const run = previewOperatorRun(tenant)
    const store = new Map<string, OperatorRun>()
    const registry: OperatorRegistry = {
      getByIdempotency: async (key) => store.get(key),
      insert: async (value) => {
        store.set(value.idempotencyKey, value)
      },
      update: async (value) => {
        store.set(value.idempotencyKey, value)
      },
    }
    expect(run.plan.length).toBeGreaterThan(5)
    const first = await submitOperatorRun(registry, run)
    const second = await submitOperatorRun(registry, run)
    expect(second.id).toBe(first.id)
    expect(redactOperatorError(new Error('token=abc password=def'))).toContain('[REDACTED]')
    expect(canRetryOperatorRun({ ...first, status: 'failed' })).toBe(true)
  })
})
