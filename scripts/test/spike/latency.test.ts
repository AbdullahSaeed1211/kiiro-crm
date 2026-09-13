import { once } from 'node:events'
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseLatencyOptions, pathResult, runLatency, type LatencyRecord } from '../../spike/latency'
import { curlCommand, formatRequest, parseCurlTiming } from '../../spike/lib/http'
import { captureLog } from './capture'

const BASE_URL = '--base-url'
const TENANT = 'https://tenant.example.test'
const fixedNow = (): Date => new Date('2026-09-13T14:22:33.456Z')
const tempDir = (): string => mkdtempSync(join(tmpdir(), 'spike-latency-'))

const server = createServer((request, response) => {
  response.writeHead(request.url === '/broken' ? 500 : 200, { 'content-type': 'text/plain' })
  response.end('ok')
})
let baseUrl = ''

beforeAll(async () => {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  baseUrl = typeof address === 'object' && address !== null ? `http://127.0.0.1:${String(address.port)}` : ''
})

afterAll(async () => {
  server.close()
  await once(server, 'close')
})

const local = (dir: string): string[] => ['--env', 'local', BASE_URL, baseUrl, '--out-dir', dir, '--client', 'fetch']

describe('latency options', () => {
  it('applies defaults and normalises the base URL', () => {
    const options = parseLatencyOptions(['--env', 'staging-a', BASE_URL, `${TENANT}/`, '--path', '/login'])
    expect(options).toMatchObject({ baseUrl: TENANT, count: 200, client: 'curl', method: 'GET', dryRun: false })
    expect(options.headers).toEqual({})
  })

  it('rejects invalid arguments', () => {
    const ok = ['--env', 'x', BASE_URL, 'http://localhost:3000']
    expect(() => parseLatencyOptions(ok)).toThrow('--path is required')
    expect(() => parseLatencyOptions([...ok, '--path', 'tasks'])).toThrow('must start with /')
    expect(() => parseLatencyOptions(['--env', 'x', '--path', '/tasks'])).toThrow('--base-url is required')
    expect(() => parseLatencyOptions([...ok, '--path', '/t', '--count', '0'])).toThrow('without --cold')
    expect(() => parseLatencyOptions([...ok, '--path', '/t', '--client', 'wget'])).toThrow('curl or fetch')
    expect(() => parseLatencyOptions([...ok, '--path', '/t', '--header', 'no-colon'])).toThrow('Name: value')
    expect(() => parseLatencyOptions([...ok, '--path', '/t', '--verbose'])).toThrow("Unknown option '--verbose'")
    expect(parseLatencyOptions([...ok, '--path', '/t', '--count', '0', '--cold']).count).toBe(0)
  })
})

describe('curl timing', () => {
  it('parses status and time_total seconds into milliseconds', () => {
    expect(parseCurlTiming('200 0.123456')).toEqual({ status: 200, ms: 123.456 })
    expect(parseCurlTiming('303 1.5\n')).toEqual({ status: 303, ms: 1500 })
    expect(parseCurlTiming('curl: (7) Failed to connect')).toBeNull()
  })

  it('builds a curl command that discards the body and writes out status and time', () => {
    const request = { method: 'POST', url: `${TENANT}/tasks`, headers: { 'Next-Action': 'abc' }, body: '[]' }
    const args = ['-sS', '-o', '/dev/null', '-w', '%{http_code} %{time_total}', '-X', 'POST']
    expect(curlCommand(request).args).toEqual([...args, '-H', 'Next-Action: abc', '--data-binary', '[]', request.url])
  })

  it('redacts credential headers when printing a request', () => {
    const request = { method: 'GET', url: TENANT, headers: { Cookie: 'session=abc', Accept: 'text/html' } }
    const printed = formatRequest(request, [])
    expect(printed).toContain('Cookie: [redacted]')
    expect(printed).toContain('Accept: text/html')
    expect(printed).not.toContain('session=abc')
  })
})

describe('runLatency against a local server', () => {
  it('writes cold, p50 and p95 per path for fetch timings', async () => {
    const dir = tempDir()
    const options = parseLatencyOptions([...local(dir), '--path', '/tasks', '--path', '/api', '--count', '5', '--cold'])
    const printed = await captureLog(() => runLatency(options, fixedNow))
    expect(printed).toContain('latency: /tasks p50')
    const record = JSON.parse(readFileSync(join(dir, 'latency-local-20260913T142233Z.json'), 'utf8')) as LatencyRecord
    expect(record.paths.map((result) => [result.path, result.count, result.statusCounts])).toEqual([
      ['/tasks', 5, { '200': 5 }],
      ['/api', 5, { '200': 5 }],
    ])
    expect(record.paths[0]?.summaryMs?.p95).toBeGreaterThan(0)
    expect(record.cold).toMatchObject({ path: '/tasks', status: 200 })
    expect(record.timer).toContain('performance.now()')
  })

  it('fails loudly on a status outside 2xx and 3xx and writes nothing', async () => {
    const dir = tempDir()
    const options = parseLatencyOptions([...local(dir), '--path', '/broken', '--count', '3'])
    await expect(runLatency(options)).rejects.toThrow('returned 500, expected 2xx or 3xx')
    expect(readdirSync(dir)).toEqual([])
  })
})

describe('runLatency dry-run', () => {
  it('prints planned requests with redacted cookies and writes nothing', async () => {
    const dir = tempDir()
    const argv = ['--env', 'local', BASE_URL, TENANT, '--out-dir', dir, '--dry-run', '--path', '/login', '--cold']
    const options = parseLatencyOptions([...argv, '--header', 'Cookie: payload-token=s3cret'])
    const printed = await captureLog(() => runLatency(options))
    expect(printed).toContain(`[dry-run] cold, 1 request: curl -sS -o /dev/null -w '%{http_code} %{time_total}' -X GET`)
    expect(printed).toContain(`'Cookie: [redacted]' ${TENANT}/login`)
    expect(printed).not.toContain('s3cret')
    expect(readdirSync(dir)).toEqual([])
  })

  it('summarises no samples as null', () => {
    expect(pathResult('/x', [])).toEqual({ path: '/x', count: 0, statusCounts: {}, summaryMs: null, samplesMs: [] })
  })
})
