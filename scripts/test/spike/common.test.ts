import { describe, expect, it } from 'vitest'
import { commonOptions, httpUrl, instantFlag, intFlag, requireFlag } from '../../spike/lib/cli'
import { fileTimestamp, outputPath, redact, roundMs } from '../../spike/lib/output'
import { formatCommand } from '../../spike/lib/process'

describe('output naming', () => {
  it('uses an ISO 8601 basic UTC timestamp without colons', () => {
    const date = new Date('2026-09-13T14:22:33.456Z')
    expect(fileTimestamp(date)).toBe('20260913T142233Z')
    expect(outputPath('latency', { outDir: 'docs/spike-data', env: 'staging-a' }, date)).toBe(
      'docs/spike-data/latency-staging-a-20260913T142233Z.json',
    )
  })

  it('rounds milliseconds to three decimals', () => {
    expect(roundMs(12.34567)).toBeCloseTo(12.346, 9)
  })
})

describe('redact', () => {
  it('replaces every occurrence of each non-empty secret', () => {
    expect(redact('a=tok b=tok c=key', ['tok', '', 'key'])).toBe('a=[redacted] b=[redacted] c=[redacted]')
  })
})

describe('argument validation', () => {
  it('requires a lowercase --env and defaults the output directory', () => {
    expect(commonOptions({ env: 'staging-a' })).toEqual({ env: 'staging-a', outDir: 'docs/spike-data', dryRun: false })
    expect(() => commonOptions({})).toThrow('--env')
    expect(() => commonOptions({ env: 'Staging A' })).toThrow('--env')
  })

  it('parses integers with a minimum and a fallback', () => {
    expect(intFlag('--count', undefined, { fallback: 5, min: 1 })).toBe(5)
    expect(intFlag('--count', '0', { fallback: 5, min: 0 })).toBe(0)
    expect(() => intFlag('--count', '0', { fallback: 5, min: 1 })).toThrow('>= 1')
    expect(() => intFlag('--count', '2.5', { fallback: 5, min: 1 })).toThrow('integer')
    expect(() => intFlag('--count', '-3', { fallback: 5, min: 0 })).toThrow('integer')
  })

  it('accepts only http(s) URLs, ISO instants and non-empty required flags', () => {
    expect(httpUrl('https://example.test/x', '--base-url')).toBe('https://example.test/x')
    expect(() => httpUrl('ftp://example.test', '--base-url')).toThrow('http or https')
    expect(() => httpUrl('localhost:3000', '--base-url')).toThrow('http or https')
    expect(instantFlag('2026-09-13T10:00:00Z', '--start').toISOString()).toBe('2026-09-13T10:00:00.000Z')
    expect(() => instantFlag('yesterday', '--start')).toThrow('ISO 8601')
    expect(() => requireFlag('', '--start')).toThrow('--start is required')
  })
})

describe('formatCommand', () => {
  it('quotes arguments that a shell would split or expand', () => {
    const line = formatCommand({ file: 'curl', args: ['-w', '%{http_code} %{time_total}', "it's", '/tasks'] })
    expect(line).toBe(`curl -w '%{http_code} %{time_total}' 'it'\\''s' /tasks`)
  })
})
