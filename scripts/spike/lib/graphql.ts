import type { RequestSpec } from './http'
import { isoSeconds } from './output'

/** Cloudflare GraphQL Analytics API endpoint. */
export const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql'

/** Documentation the dataset and field names were checked against (fetched 2026-09-13). */
export const GRAPHQL_DOCS = [
  'https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/',
  'https://developers.cloudflare.com/d1/observability/metrics-analytics/',
  'https://developers.cloudflare.com/r2/platform/metrics-analytics/',
  'https://developers.cloudflare.com/analytics/graphql-api/getting-started/querying-basics/',
  'https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/',
] as const

/** Inclusive UTC query window as ISO 8601 instants. */
export interface TimeWindow {
  readonly start: string
  readonly end: string
}

/** JSON body of a GraphQL request; the query is a single line, as the API requires. */
export interface GraphqlBody {
  readonly query: string
  readonly variables: Readonly<Record<string, string>>
}

function accountQuery(
  name: string,
  variables: string,
  dataset: { name: string; filter: string; fields: string },
): string {
  const node = `${dataset.name}(limit: 10000, filter: { ${dataset.filter} }) { ${dataset.fields} }`
  return `query ${name}(${variables}) { viewer { accounts(filter: { accountTag: $accountTag }) { ${node} } } }`
}

/** Workers requests and CPU time quantiles for one script over the window (`workersInvocationsAdaptive`). */
export function workersQuery(accountTag: string, scriptName: string, window: TimeWindow): GraphqlBody {
  const query = accountQuery('SpikeWorkers', '$accountTag: string, $scriptName: string, $start: string, $end: string', {
    name: 'workersInvocationsAdaptive',
    filter: 'scriptName: $scriptName, datetime_geq: $start, datetime_leq: $end',
    fields: 'sum { requests errors subrequests } quantiles { cpuTimeP50 cpuTimeP99 } dimensions { scriptName }',
  })
  return { query, variables: { accountTag, scriptName, start: window.start, end: window.end } }
}

/** Floors an ISO instant to its UTC hour, because D1 analytics are filtered on `datetimeHour`. */
export function floorToHour(iso: string): string {
  const date = new Date(iso)
  date.setUTCMinutes(0, 0, 0)
  return isoSeconds(date)
}

/** D1 query and row counts per hour for one database (`d1AnalyticsAdaptiveGroups`). */
export function d1Query(accountTag: string, databaseId: string, window: TimeWindow): GraphqlBody {
  const query = accountQuery('SpikeD1', '$accountTag: string!, $databaseId: string, $start: Time, $end: Time', {
    name: 'd1AnalyticsAdaptiveGroups',
    filter: 'databaseId: $databaseId, datetimeHour_geq: $start, datetimeHour_leq: $end',
    fields: 'sum { readQueries writeQueries rowsRead rowsWritten } dimensions { datetimeHour }',
  })
  return { query, variables: { accountTag, databaseId, start: floorToHour(window.start), end: window.end } }
}

/** R2 operation counts by action type for one bucket (`r2OperationsAdaptiveGroups`). */
export function r2Query(accountTag: string, bucketName: string, window: TimeWindow): GraphqlBody {
  const query = accountQuery('SpikeR2', '$accountTag: string!, $bucketName: string, $start: Time, $end: Time', {
    name: 'r2OperationsAdaptiveGroups',
    filter: 'bucketName: $bucketName, datetime_geq: $start, datetime_leq: $end',
    fields: 'sum { requests } dimensions { actionType }',
  })
  return { query, variables: { accountTag, bucketName, start: window.start, end: window.end } }
}

/** POST request carrying `body`, authorised with a bearer `token`. */
export function graphqlRequest(body: GraphqlBody, token: string): RequestSpec {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }
  return { method: 'POST', url: GRAPHQL_ENDPOINT, headers, body: JSON.stringify(body) }
}
