import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { main } from '../../deploy-tenants'
import { TENANTS_DIR_ENV } from '../../lib/tenants-dir'

const LIVE_KEYS = ['OPS_ALLOW_LIVE', 'INTERNAL_SECRET_EXAMPLE', TENANTS_DIR_ENV] as const
// The committed example tenant, so a real tenants directory in the environment can never be released from a test.
const EXAMPLE_TENANTS = fileURLToPath(new URL('../../../tenants', import.meta.url))

afterEach(() => {
  for (const key of LIVE_KEYS) Reflect.deleteProperty(process.env, key)
})

describe('deployment preflight', () => {
  // Never add a case where the preflight passes with --execute: main would then run the live release.
  it('stops a live release before any remote command when a tenant secret is missing', async () => {
    process.env['OPS_ALLOW_LIVE'] = '1'
    process.env[TENANTS_DIR_ENV] = EXAMPLE_TENANTS
    Reflect.deleteProperty(process.env, 'INTERNAL_SECRET_EXAMPLE')
    expect(await main(['--tag', 'v0.0.0-test', '--execute'])).toBe(1)
  })
})
