import { cpSync, existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkSize, growthFailure, measure, readBaseline } from '../../check-size'
import { CLI_TIMEOUT, FIXTURES, runCheck } from './run-check'

const grown = join(FIXTURES, 'size', 'grown')

describe('check:size', () => {
  it('measures worker.js plus handler.mjs', () => {
    const record = measure(join(grown, 'build'))
    expect(Object.keys(record?.files ?? {})).toEqual(['worker.js', 'server-functions/default/handler.mjs'])
    expect(record?.totalBytes).toBeGreaterThan(120)
    expect(measure(join(grown, 'missing'))).toBeNull()
  })

  it('reads the committed baseline', () => {
    expect(readBaseline(grown)).toBe(100)
    expect(readBaseline(join(grown, 'build'))).toBeNull()
  })

  it('fails only on growth above 20%', () => {
    expect(growthFailure(120, 100)).toBeNull()
    expect(growthFailure(121, 100)).toContain('+21.0%')
    expect(growthFailure(500, null)).toBeNull()
  })

  it('writes the report only with --write', () => {
    const root = mkdtempSync(join(tmpdir(), 'check-size-'))
    cpSync(join(grown, 'build'), join(root, 'build'), { recursive: true })
    expect(checkSize({ root, build: 'build', write: false, allowGrowth: false })).toBe(0)
    expect(existsSync(join(root, 'docs/reports/size.json'))).toBe(false)
    expect(checkSize({ root, build: 'build', write: true, allowGrowth: false })).toBe(0)
    expect(readBaseline(root)).toBe(measure(join(root, 'build'))?.totalBytes)
  })

  it('exits 0 with a notice when there is no build output', { timeout: CLI_TIMEOUT }, () => {
    const run = runCheck('check-size.ts', ['--root', grown, '--build', 'missing'])
    expect(run.code).toBe(0)
    expect(run.stdout).toContain('no build output')
  })

  it('exits 1 on the planted growth fixture unless --allow-growth is passed', { timeout: CLI_TIMEOUT }, () => {
    const run = runCheck('check-size.ts', ['--root', grown, '--build', 'build'])
    expect(run.code).toBe(1)
    expect(run.stderr).toContain('limit +20%')
    expect(runCheck('check-size.ts', ['--root', grown, '--build', 'build', '--allow-growth']).code).toBe(0)
  })
})
