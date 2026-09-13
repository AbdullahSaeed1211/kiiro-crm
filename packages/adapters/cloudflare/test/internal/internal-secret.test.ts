import { describe, expect, it } from 'vitest'
import { INTERNAL_SECRET_HEADER } from '../../src/contracts/worker'
import { internalSecretMatches, rejectUnauthorized } from '../../src/internal/internal-secret'

const SECRET = 'tenant-internal-secret-0123456789'

describe('internalSecretMatches', () => {
  it('accepts the exact secret', async () => {
    expect(await internalSecretMatches(SECRET, SECRET)).toBe(true)
  })

  it('rejects a wrong value of the same length', async () => {
    const wrong = `${SECRET.slice(0, -1)}X`
    expect(wrong).toHaveLength(SECRET.length)
    expect(await internalSecretMatches(wrong, SECRET)).toBe(false)
  })

  it.each([
    ['shorter', SECRET.slice(0, 8)],
    ['longer', `${SECRET}0`],
    ['empty', ''],
  ])('rejects a %s secret', async (_label, presented) => {
    expect(await internalSecretMatches(presented, SECRET)).toBe(false)
  })

  it('rejects a missing header and an unset or empty tenant secret', async () => {
    expect(await internalSecretMatches(null, SECRET)).toBe(false)
    expect(await internalSecretMatches(SECRET, undefined)).toBe(false)
    expect(await internalSecretMatches('', '')).toBe(false)
  })
})

describe('rejectUnauthorized', () => {
  const request = (headers: Record<string, string>) => new Request('https://tenant.example.test/', { headers })

  it('returns 401 JSON without the right header and nothing with it', async () => {
    const refused = await rejectUnauthorized(request({ [INTERNAL_SECRET_HEADER]: 'wrong' }), SECRET)
    expect(refused?.status).toBe(401)
    expect(await refused?.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid internal secret' },
    })
    expect(await rejectUnauthorized(request({ [INTERNAL_SECRET_HEADER]: SECRET }), SECRET)).toBeUndefined()
  })
})
