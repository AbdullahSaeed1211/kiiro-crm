import { expect, it } from 'vitest'
import { createRateLimiter } from '../../src/intake/rate-limit'

it('passes the generated Cloudflare binding options shape', async () => {
  const calls: unknown[] = []
  const limiter = createRateLimiter({
    limit: (options) => {
      calls.push(options)
      return Promise.resolve({ success: options.key === 'hashed-ip:form' })
    },
  })
  expect(await limiter.check('hashed-ip:form')).toBe(true)
  expect(calls).toEqual([{ key: 'hashed-ip:form' }])
})
