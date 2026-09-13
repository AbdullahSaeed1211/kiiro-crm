import { domainError, type ErrorCode } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { domainErrorResponse } from '../../src/internal/responses'

describe('domainErrorResponse', () => {
  it.each<[ErrorCode, number]>([
    ['VALIDATION', 400],
    ['NOT_FOUND', 404],
    ['FORBIDDEN', 403],
    ['CONFLICT', 409],
    ['ALREADY_DONE', 409],
    ['RATE_LIMITED', 429],
    ['UNAVAILABLE', 503],
    ['INTERNAL', 500],
  ])('maps %s to HTTP %i (spec §12.1)', (code, status) => {
    expect(domainErrorResponse(domainError(code, 'm')).status).toBe(status)
  })

  it('returns code and message but never details', async () => {
    const response = domainErrorResponse(domainError('INTERNAL', 'failed', { secret: 'x' }))
    expect(await response.json()).toEqual({ error: { code: 'INTERNAL', message: 'failed' } })
  })
})
