import { describe, expect, it } from 'vitest'
import { parseIntakeFormSettings, randomServerKey, sha256Hex } from '../src/app/(app)/settings/intake/intake-validation'

const validSettings = {
  name: 'Website contact',
  key: 'website-contact',
  allowedOrigins: 'https://www.example.com\nhttps://www.example.com/',
  requireTurnstile: true,
  defaultAssigneeIds: [],
  notifyUserIds: [],
  notifyGroupIds: [],
  successMessage: 'Thanks. We will be in touch.',
}

describe('intake settings validation', () => {
  it('normalizes exact origins and keeps secure defaults', () => {
    expect(parseIntakeFormSettings(validSettings)).toMatchObject({
      ok: true,
      data: {
        allowedOrigins: ['https://www.example.com'],
        requireTurnstile: true,
        redirectUrl: null,
        emailAlias: null,
      },
    })
  })

  it('rejects paths and non-http origins', () => {
    expect(parseIntakeFormSettings({ ...validSettings, allowedOrigins: 'https://example.com/form' })).toEqual({
      ok: false,
      error: 'Allowed origin is invalid: https://example.com/form',
    })
    expect(parseIntakeFormSettings({ ...validSettings, allowedOrigins: 'javascript:alert(1)' })).toEqual({
      ok: false,
      error: 'Allowed origin is invalid: javascript:alert(1)',
    })
  })

  it('creates a high-entropy key and only exposes its digest to persistence callers', async () => {
    const key = randomServerKey()
    expect(key).toMatch(/^intake_[0-9a-f]{48}$/)
    expect(await sha256Hex(key)).toMatch(/^[0-9a-f]{64}$/)
    expect(await sha256Hex(key)).not.toBe(key)
  })
})
