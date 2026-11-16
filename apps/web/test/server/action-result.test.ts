import { afterEach, describe, expect, it, vi } from 'vitest'
import { actionFailure, toActionResult } from '../../src/server/action-result'

const FALLBACK = 'Try again.'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('action results', () => {
  it('logs an unexpected exception and shows only the fallback copy', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const result = actionFailure(new Error('D1_ERROR: no such column users.secret'), 'invite member', FALLBACK)
    expect(result).toEqual({ ok: false, error: { code: 'INTERNAL', message: FALLBACK } })
    expect(log.mock.calls.join('')).toContain('no such column')
  })

  it("passes Payload's user-facing validation messages through", () => {
    const error = Object.assign(new Error('The following field is invalid: email'), { name: 'ValidationError' })
    expect(actionFailure(error, 'invite member', FALLBACK).error).toEqual({
      code: 'VALIDATION',
      message: 'The following field is invalid: email',
    })
  })

  it('maps a minified 403 error to safe permission copy', () => {
    const error = Object.assign(new Error('You are not allowed to perform this action.'), { name: 'l2', status: 403 })
    expect(actionFailure(error, 'list tasks', FALLBACK).error).toEqual({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action.',
    })
  })

  it('maps a module result without changing its code', () => {
    expect(toActionResult({ ok: false, error: { code: 'CONFLICT', message: 'Changed.' } })).toEqual({
      ok: false,
      error: { code: 'CONFLICT', message: 'Changed.' },
    })
  })
})
