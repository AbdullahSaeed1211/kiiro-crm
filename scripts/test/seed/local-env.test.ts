import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertLocalOnly,
  localD1StateDir,
  localPayloadSecret,
  parseDevVars,
  remoteSettingOf,
} from '../../seed/local-env'

describe('remoteSettingOf', () => {
  it('allows a local development environment', () => {
    expect(remoteSettingOf({ NODE_ENV: 'development' })).toBeUndefined()
    expect(remoteSettingOf({})).toBeUndefined()
  })

  it('refuses production and remote settings', () => {
    expect(remoteSettingOf({ NODE_ENV: 'production' })).toBe('NODE_ENV is production')
    expect(remoteSettingOf({ CLOUDFLARE_ENV: 'staging-a' })).toBe('CLOUDFLARE_ENV is set')
    expect(remoteSettingOf({ PAYLOAD_REMOTE_BINDINGS: '0' })).toBe('PAYLOAD_REMOTE_BINDINGS is set')
    expect(remoteSettingOf({ CLOUDFLARE_ENV: '' })).toBe('CLOUDFLARE_ENV is set')
  })

  it('throws through assertLocalOnly', () => {
    expect(() => {
      assertLocalOnly({ PAYLOAD_REMOTE_BINDINGS: '1' })
    }).toThrow(/PAYLOAD_REMOTE_BINDINGS/)
  })
})

describe('parseDevVars', () => {
  it('reads keys and values, skipping comments and blank lines', () => {
    const vars = parseDevVars('# local\n\nA=1\nB = "two words"\nC=x=y\nnot a pair\n')
    expect([...vars]).toEqual([
      ['A', '1'],
      ['B', 'two words'],
      ['C', 'x=y'],
    ])
  })
})

describe('localPayloadSecret', () => {
  const dir = (): string => mkdtempSync(join(tmpdir(), 'seed-env-'))

  it('prefers .dev.vars over the example file', () => {
    const webDir = dir()
    writeFileSync(join(webDir, '.dev.vars.example'), 'PAYLOAD_SECRET=example\n')
    expect(localPayloadSecret(webDir)).toBe('example')
    writeFileSync(join(webDir, '.dev.vars'), 'PAYLOAD_SECRET=local\n')
    expect(localPayloadSecret(webDir)).toBe('local')
  })

  it('throws without a secret', () => {
    expect(() => localPayloadSecret(dir())).toThrow(/PAYLOAD_SECRET/)
  })
})

describe('localD1StateDir', () => {
  it('stays inside the web app .wrangler directory', () => {
    expect(localD1StateDir('/repo/apps/web')).toBe('/repo/apps/web/.wrangler/state/v3/d1')
  })
})
