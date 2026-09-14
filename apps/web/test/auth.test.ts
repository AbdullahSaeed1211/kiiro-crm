import { describe, expect, it } from 'vitest'
import { bodyOf, errorResponse, passwordPolicyResponse, unsupportedContentType } from '../src/server/auth/request'

describe('product auth request boundary', () => {
  it('rejects non-JSON and oversized request bodies', async () => {
    expect(unsupportedContentType(new Request('https://test', { method: 'POST' }))).toMatchObject({ status: 415 })
    const request = new Request('https://test', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '20000' },
      body: '{}',
    })
    await expect(bodyOf(request)).resolves.toBeUndefined()
  })

  it('uses the shared D-46 password response', () => {
    expect(passwordPolicyResponse('short')).toMatchObject({ status: 400 })
    expect(passwordPolicyResponse('secure password 123', 'user@example.com')).toBeUndefined()
    expect(passwordPolicyResponse('user@example.com', 'user@example.com')).toMatchObject({ status: 400 })
  })

  it('does not expose arbitrary internal errors', async () => {
    const response = errorResponse(new Error('database password leaked'), 'Authentication failed.')
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Authentication failed.' })
  })
})
