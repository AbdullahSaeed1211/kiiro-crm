import { afterEach, describe, expect, it } from 'vitest'
import { main } from '../../deploy-tenants'

const LIVE_KEYS = ['OPS_ALLOW_LIVE', 'INTERNAL_SECRET_MIRCHMEDIA'] as const

afterEach(() => {
  for (const key of LIVE_KEYS) Reflect.deleteProperty(process.env, key)
})

describe('deployment preflight', () => {
  // Never add a case where the preflight passes with --execute: main would then run the live release.
  it('stops a live release before any remote command when a tenant secret is missing', async () => {
    process.env['OPS_ALLOW_LIVE'] = '1'
    Reflect.deleteProperty(process.env, 'INTERNAL_SECRET_MIRCHMEDIA')
    expect(await main(['--tag', 'v0.0.0-test', '--execute'])).toBe(1)
  })
})
