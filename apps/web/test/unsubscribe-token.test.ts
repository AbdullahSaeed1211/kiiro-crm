import { describe, expect, it } from 'vitest'
import { isValidUnsubscribeToken, unsubscribeToken } from '../src/server/newsletter/token'

describe('unsubscribe token', () => {
  it('accepts its own token and refuses another contact, another secret and a changed token', async () => {
    const token = await unsubscribeToken('secret-a', 'contact-1')
    expect(await isValidUnsubscribeToken('secret-a', 'contact-1', token)).toBe(true)
    expect(await isValidUnsubscribeToken('secret-a', 'contact-2', token)).toBe(false)
    expect(await isValidUnsubscribeToken('secret-b', 'contact-1', token)).toBe(false)
    expect(await isValidUnsubscribeToken('secret-a', 'contact-1', `${token.slice(0, -1)}x`)).toBe(false)
    expect(await isValidUnsubscribeToken('secret-a', 'contact-1', '')).toBe(false)
  })
})
