import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { credentials, parseAnalyticsOptions, plannedQueries, runAnalytics } from '../../spike/analytics'
import { datasetRows, parseD1, parseR2, parseWorkers } from '../../spike/lib/analytics-parse'
import { d1Query, floorToHour, graphqlRequest, r2Query, workersQuery } from '../../spike/lib/graphql'
import { formatRequest } from '../../spike/lib/http'
import { captureLog } from './capture'

const TOKEN = 'cf-live-token-0123456789'
const HOUR_14 = '2026-09-13T14:00:00Z'
const HOUR_15 = '2026-09-13T15:00:00Z'
const window = { start: '2026-09-13T14:22:33Z', end: '2026-09-13T15:05:00Z' }
const fixedNow = (): Date => new Date('2026-09-13T15:06:00Z')
const fixture = join(import.meta.dirname, 'fixtures/workers-invocations-docs.json')
const docsSample: unknown = JSON.parse(readFileSync(fixture, 'utf8'))
const account = (dataset: string, rows: unknown[]): unknown => {
  return { data: { viewer: { accounts: [{ [dataset]: rows }] } }, errors: null }
}

describe('Workers query body', () => {
  it('queries workersInvocationsAdaptive CPU quantiles for one script', () => {
    const body = workersQuery('acc-1', 'ops-staging-a', window)
    expect(body.query).not.toContain('\n')
    expect(body.query).toContain('accounts(filter: { accountTag: $accountTag })')
    expect(body.query).toContain(
      'workersInvocationsAdaptive(limit: 10000, filter: { scriptName: $scriptName, datetime_geq: $start, datetime_leq: $end })',
    )
    expect(body.query).toContain('quantiles { cpuTimeP50 cpuTimeP99 }')
    expect(body.query).toContain('sum { requests errors subrequests }')
    expect(body.variables).toEqual({ accountTag: 'acc-1', scriptName: 'ops-staging-a', ...window })
  })

  it('wraps a body in an authenticated POST to the GraphQL endpoint', () => {
    const body = workersQuery('acc-1', 'w', window)
    const request = graphqlRequest(body, 'tok')
    expect(request).toMatchObject({ method: 'POST', url: 'https://api.cloudflare.com/client/v4/graphql' })
    expect(request.headers['Authorization']).toBe('Bearer tok')
    expect(JSON.parse(request.body ?? '')).toEqual(body)
  })
})

describe('D1 and R2 query bodies', () => {
  it('queries D1 rows read and written from the start of the hour', () => {
    const body = d1Query('acc-1', 'db-uuid', window)
    expect(body.query).toContain(
      'd1AnalyticsAdaptiveGroups(limit: 10000, filter: { databaseId: $databaseId, datetimeHour_geq',
    )
    expect(body.query).toContain('sum { readQueries writeQueries rowsRead rowsWritten }')
    expect(body.variables).toEqual({ accountTag: 'acc-1', databaseId: 'db-uuid', start: HOUR_14, end: window.end })
    expect(floorToHour('2026-09-13T23:59:59Z')).toBe('2026-09-13T23:00:00Z')
  })

  it('queries R2 operations by action type for one bucket', () => {
    const body = r2Query('acc-1', 'ops-staging-a-files', window)
    expect(body.query).toContain(
      'r2OperationsAdaptiveGroups(limit: 10000, filter: { bucketName: $bucketName, datetime_geq',
    )
    expect(body.query).toContain('sum { requests } dimensions { actionType }')
    expect(body.variables['bucketName']).toBe('ops-staging-a-files')
  })
})

describe('Workers response parsing', () => {
  it('parses the Workers sample response from the docs', () => {
    expect(parseWorkers(docsSample)).toEqual({
      groups: 3,
      requests: 6,
      errors: 0,
      subrequests: 0,
      cpuTimeP50: null,
      cpuTimeP99: null,
      quantilesByGroup: [
        { cpuTimeP50: 206, cpuTimeP99: 206 },
        { cpuTimeP50: 291, cpuTimeP99: 291 },
        { cpuTimeP50: 212.5, cpuTimeP99: 261.19 },
      ],
    })
  })

  it('reports top-level quantiles when the window is one group', () => {
    const row = {
      sum: { requests: 800, errors: 2, subrequests: 40 },
      quantiles: { cpuTimeP50: 1840, cpuTimeP99: 9120.5 },
    }
    const expected = { requests: 800, cpuTimeP50: 1840, cpuTimeP99: 9120.5 }
    expect(parseWorkers(account('workersInvocationsAdaptive', [row]))).toMatchObject(expected)
  })
})

describe('D1 and R2 response parsing', () => {
  it('sums D1 hour buckets', () => {
    const d1 = account('d1AnalyticsAdaptiveGroups', [
      {
        sum: { readQueries: 10, writeQueries: 2, rowsRead: 120, rowsWritten: 4 },
        dimensions: { datetimeHour: HOUR_14 },
      },
      { sum: { readQueries: 5, writeQueries: 1, rowsRead: 30, rowsWritten: 2 }, dimensions: { datetimeHour: HOUR_15 } },
    ])
    const expected = { hours: [HOUR_14, HOUR_15], readQueries: 15, writeQueries: 3, rowsRead: 150, rowsWritten: 6 }
    expect(parseD1(d1)).toEqual(expected)
  })

  it('counts R2 operations by action type', () => {
    const r2 = account('r2OperationsAdaptiveGroups', [
      { sum: { requests: 3 }, dimensions: { actionType: 'PutObject' } },
      { sum: { requests: 7 }, dimensions: { actionType: 'GetObject' } },
    ])
    expect(parseR2(r2)).toEqual({ requests: 10, byActionType: { PutObject: 3, GetObject: 7 } })
  })

  it('throws on GraphQL errors and on an unexpected shape', () => {
    const denied = { data: null, errors: [{ message: 'not authorized for that account' }] }
    expect(() => datasetRows(denied, 'd1AnalyticsAdaptiveGroups')).toThrow('not authorized for that account')
    expect(() => datasetRows({ data: { viewer: { accounts: [] } } }, 'x')).toThrow('accounts[0].x')
  })
})

describe('analytics options and credentials', () => {
  const now = new Date('2026-09-13T15:05:00.900Z')

  it('defaults --end to now and needs at least one target', () => {
    const options = parseAnalyticsOptions(['--env', 'staging-a', '--start', window.start, '--script', 'w'], now)
    expect(options.window).toEqual(window)
    expect(() => parseAnalyticsOptions(['--env', 'e', '--start', HOUR_14], now)).toThrow('at least one')
    expect(() => parseAnalyticsOptions(['--env', 'e', '--script', 'w'], now)).toThrow('--start is required')
    const late = ['--env', 'e', '--script', 'w', '--start', '2026-09-13T16:00:00Z']
    expect(() => parseAnalyticsOptions(late, now)).toThrow('before --end')
  })

  it('names missing environment variables', () => {
    expect(() => credentials({})).toThrow('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID')
    expect(() => credentials({ CLOUDFLARE_API_TOKEN: 't' })).toThrow(/set CLOUDFLARE_ACCOUNT_ID \(/)
    expect(credentials({ CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ACCOUNT_ID: 'a' })).toEqual({
      token: 't',
      accountId: 'a',
    })
  })
})

describe('analytics dry-run', () => {
  it('never prints the token', () => {
    const printed = formatRequest(graphqlRequest(workersQuery('acc', 'w', window), TOKEN), [TOKEN])
    expect(printed).toContain('Authorization: Bearer [redacted]')
    expect(printed).not.toContain(TOKEN)
  })

  it('prints one POST per target without reading credentials from the environment', async () => {
    const argv = ['--env', 'staging-a', '--start', window.start, '--end', window.end, '--dry-run']
    const options = parseAnalyticsOptions([...argv, '--script', 'w', '--database-id', 'db', '--bucket', 'b'])
    expect(plannedQueries(options, 'acc').map((query) => query.key)).toEqual(['workers', 'd1', 'r2'])
    const env = { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: 'real-account-id' }
    const printed = await captureLog(() => runAnalytics(options, env, fixedNow))
    expect(printed.match(/\[dry-run\] POST https:\/\/api\.cloudflare\.com\/client\/v4\/graphql/g)).toHaveLength(3)
    expect(printed).toContain('Authorization: Bearer [redacted]')
    expect(printed).toContain('"accountTag":"<CLOUDFLARE_ACCOUNT_ID>"')
    expect(printed).not.toContain(TOKEN)
    expect(printed).not.toContain('real-account-id')
    expect(printed).toContain('[dry-run] write docs/spike-data/analytics-staging-a-20260913T150600Z.json')
  })
})
