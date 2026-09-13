import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  parseStartupOptions,
  parseStartupTime,
  parseVersionId,
  runStartup,
  startupRecord,
  wranglerCommand,
} from '../../spike/startup'
import { captureLog } from './capture'

const COLD_URL = '--cold-url'
const startedAt = new Date('2026-09-13T14:22:33Z')
const fixedNow = (): Date => startedAt

// Lines assembled from the wrangler 4.131.1 source (versions upload); no upload was run.
const uploadOutput = readFileSync(join(import.meta.dirname, 'fixtures/wrangler-versions-upload.txt'), 'utf8')

describe('wrangler output parsing', () => {
  it('reads startup time and version id from a versions upload output', () => {
    expect(parseStartupTime(uploadOutput)).toBe(684)
    expect(parseVersionId(uploadOutput)).toBe('3c9f7a2e-5b1d-4e8a-9f60-2d7c4b8e1a05')
  })

  it('returns null when the startup time is missing or undefined', () => {
    expect(parseStartupTime('Worker Startup Time: undefined ms')).toBeNull()
    expect(parseStartupTime('Uploaded ops-staging-a (3.00 sec)')).toBeNull()
    expect(parseVersionId('Worker Version ID: undefined')).toBeNull()
    expect(parseStartupTime('Worker Startup Time: 12.5 ms')).toBe(12.5)
  })
})

describe('startup options', () => {
  it('defaults to 5 uploads through the web package', () => {
    const options = parseStartupOptions(['--env', 'staging-a'])
    expect(options).toMatchObject({ count: 5, filter: 'web', deploy: false, settleMs: 15000, dryRun: false })
    const expected = ['--filter', 'web', 'exec', 'wrangler', 'versions', 'upload', '--env', 'staging-a']
    expect(wranglerCommand(options, ['upload']).args).toEqual(expected)
  })

  it('rejects invalid arguments', () => {
    expect(() => parseStartupOptions([])).toThrow('--env')
    expect(() => parseStartupOptions(['--env', 'e', '--count', '0'])).toThrow('--count must be an integer >= 1')
    expect(() => parseStartupOptions(['--env', 'e', COLD_URL, 'https://h/login'])).toThrow('needs --deploy')
    expect(() => parseStartupOptions(['--env', 'e', '--deploy', COLD_URL, 'h/login'])).toThrow('http or https')
    expect(() => parseStartupOptions(['--env', 'e', 'extra'])).toThrow('Unexpected argument')
  })
})

describe('runStartup', () => {
  it('prints uploads, deploys and cold requests in dry-run and writes nothing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'spike-startup-'))
    const argv = ['--env', 'staging-a', '--count', '2', '--deploy', COLD_URL, 'https://h.example.test/login']
    const options = parseStartupOptions([...argv, '--out-dir', dir, '--dry-run'])
    const printed = await captureLog(() => runStartup(options, fixedNow))
    const wrangler = 'pnpm --filter web exec wrangler versions'
    expect(printed).toContain(`[dry-run] run 1: ${wrangler} upload --env staging-a`)
    expect(printed).toContain(
      `[dry-run] run 2: ${wrangler} deploy '<version-id-of-run-2>@100%' --yes --message 'startup measurement run 2' --env staging-a`,
    )
    expect(printed).toContain('[dry-run] run 2: wait 15000 ms, then GET https://h.example.test/login once')
    expect(printed).toContain(`[dry-run] write ${join(dir, 'startup-staging-a-20260913T142233Z.json')}`)
    expect(readdirSync(dir)).toEqual([])
  })

  it('summarises startup and cold times as min, median and max', () => {
    const options = parseStartupOptions(['--env', 'staging-a', '--deploy', COLD_URL, 'https://h/login'])
    const runs = [
      { run: 1, startupTimeMs: 700, versionId: 'a', cold: { ms: 1200, status: 200 } },
      { run: 2, startupTimeMs: 650, versionId: 'b', cold: { ms: 900, status: 200 } },
      { run: 3, startupTimeMs: 900, versionId: 'c', cold: { ms: 1000, status: 302 } },
      { run: 4, startupTimeMs: 610, versionId: 'd', cold: { ms: 1100, status: 200 } },
    ]
    expect(startupRecord(options, runs, startedAt)).toMatchObject({
      metric: 'startup',
      startupTimeMs: { count: 4, min: 610, median: 650, max: 900 },
      coldMs: { count: 4, min: 900, median: 1000, max: 1200 },
      settleMs: 15000,
    })
  })
})
