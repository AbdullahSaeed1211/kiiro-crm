import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brandFiles, brandPattern, checkBrand, tenantNames } from '../../check-brand'
import { FIXTURES } from './run-check'

const fixture = join(FIXTURES, 'brand')

describe('check:brand', () => {
  it('reads tenant display names from tenants/*.jsonc', () => {
    expect(tenantNames(fixture)).toEqual(['Globex Studio'])
    expect(tenantNames(join(fixture, 'apps'))).toEqual([])
  })

  it('matches base tokens and tenant names case-insensitively', () => {
    const text = 'MIRCH, Plane, huly and globex studio'
    const tokens = [...text.matchAll(brandPattern(['Globex Studio']))].map((match) => match[0])
    expect(tokens).toEqual(['MIRCH', 'Plane', 'huly', 'globex studio'])
  })

  it('reports planted leaks in apps and packages and skips generated tenant configs', () => {
    expect(brandFiles(fixture)).not.toContain('apps/web/cloudflare-env.d.ts')
    expect(brandFiles(fixture)).not.toContain('apps/mail-router/wrangler.jsonc')
    expect(checkBrand(fixture)).toEqual(['apps/site/src/copy.ts:2 MIRCH', 'apps/site/src/copy.ts:3 globex studio'])
  })

  it('skips dependency and build directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'check-brand-'))
    for (const dir of ['apps/web/node_modules/dep', 'apps/web/.next', 'apps/web/.open-next', 'tenants-not-scanned']) {
      mkdirSync(join(root, dir), { recursive: true })
      writeFileSync(join(root, dir, 'index.js'), 'frappe')
    }
    expect(checkBrand(root)).toEqual([])
  })

  it('scans a build output directory in full with --path', () => {
    const output = join(fixture, 'output')
    expect(checkBrand(fixture, output)).toEqual([`${join(output, 'assets/strings.txt')}:1 Twenty`])
  })
})

describe('check:brand local runtime config', () => {
  it('skips tenant identity and operator addresses', () => {
    const root = mkdtempSync(join(tmpdir(), 'check-brand-config-'))
    for (const file of ['apps/web/.dev.vars', 'apps/web/.dev.vars.example']) {
      const path = join(root, file)
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, 'TENANT_DISPLAY_NAME=Mirch Media\nOPERATOR_EMAILS=mirchads@example.test\n')
    }
    expect(brandFiles(root)).not.toContain('apps/web/.dev.vars')
    expect(brandFiles(root)).not.toContain('apps/web/.dev.vars.example')
    expect(checkBrand(root)).toEqual([])
  })
})
