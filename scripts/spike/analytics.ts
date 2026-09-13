import { parseArgs } from 'node:util'
import { isMain } from '../lib/report'
import { parseD1, parseR2, parseWorkers } from './lib/analytics-parse'
import { COMMON_OPTIONS, commonOptions, instantFlag, requireFlag, runCli, UsageError } from './lib/cli'
import type { CommonOptions } from './lib/cli'
import { d1Query, GRAPHQL_DOCS, GRAPHQL_ENDPOINT, graphqlRequest, r2Query, workersQuery } from './lib/graphql'
import type { GraphqlBody, TimeWindow } from './lib/graphql'
import { formatRequest } from './lib/http'
import { isoSeconds, outputPath, printPlanned, redact, writeJson } from './lib/output'

/** Options for {@link runAnalytics}. */
export interface AnalyticsOptions extends CommonOptions {
  readonly window: TimeWindow
  readonly script: string | undefined
  readonly databaseId: string | undefined
  readonly bucket: string | undefined
}

/** One GraphQL request and the parser for its response. */
export interface PlannedQuery {
  readonly key: 'workers' | 'd1' | 'r2'
  readonly body: GraphqlBody
  readonly parse: (response: unknown) => unknown
}

const TOKEN_VARIABLE = 'CLOUDFLARE_API_TOKEN'
const ACCOUNT_VARIABLE = 'CLOUDFLARE_ACCOUNT_ID'

/** Parses and validates the command line; `--end` defaults to `now`. */
export function parseAnalyticsOptions(argv: readonly string[], now: Date = new Date()): AnalyticsOptions {
  const text = { type: 'string' } as const
  const options = { ...COMMON_OPTIONS, start: text, end: text, script: text, 'database-id': text, bucket: text }
  const { values } = parseArgs({ args: [...argv], options })
  const start = instantFlag(requireFlag(values.start, '--start'), '--start')
  const end = values.end === undefined ? now : instantFlag(values.end, '--end')
  if (start.getTime() >= end.getTime()) throw new UsageError('--start must be before --end')
  const targets = { script: values.script, databaseId: values['database-id'], bucket: values.bucket }
  if (Object.values(targets).every((target) => target === undefined)) {
    throw new UsageError('pass at least one of --script, --database-id, --bucket')
  }
  return { ...commonOptions(values), window: { start: isoSeconds(start), end: isoSeconds(end) }, ...targets }
}

/** GraphQL requests for the requested targets, in Workers, D1, R2 order. */
export function plannedQueries(options: AnalyticsOptions, accountTag: string): PlannedQuery[] {
  const { window } = options
  const queries: PlannedQuery[] = []
  if (options.script !== undefined) {
    queries.push({ key: 'workers', body: workersQuery(accountTag, options.script, window), parse: parseWorkers })
  }
  if (options.databaseId !== undefined) {
    queries.push({ key: 'd1', body: d1Query(accountTag, options.databaseId, window), parse: parseD1 })
  }
  if (options.bucket !== undefined) {
    queries.push({ key: 'r2', body: r2Query(accountTag, options.bucket, window), parse: parseR2 })
  }
  return queries
}

/** API token and account id from `env`; throws naming whichever variable is missing. */
export function credentials(env: Readonly<Record<string, string | undefined>>): { token: string; accountId: string } {
  const token = env[TOKEN_VARIABLE] ?? ''
  const accountId = env[ACCOUNT_VARIABLE] ?? ''
  const missing = [token === '' ? TOKEN_VARIABLE : '', accountId === '' ? ACCOUNT_VARIABLE : ''].filter(Boolean)
  if (missing.length > 0) throw new Error(`set ${missing.join(' and ')} (token needs Account Analytics Read)`)
  return { token, accountId }
}

async function postGraphql(body: GraphqlBody, token: string): Promise<unknown> {
  const request = graphqlRequest(body, token)
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body ?? null,
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`GraphQL HTTP ${String(response.status)}: ${redact(text.slice(0, 500), [token])}`)
  const data: unknown = JSON.parse(text)
  return data
}

function planAnalytics(options: AnalyticsOptions, file: string): void {
  const token = `<${TOKEN_VARIABLE}>`
  for (const query of plannedQueries(options, `<${ACCOUNT_VARIABLE}>`)) {
    printPlanned(formatRequest(graphqlRequest(query.body, token), [token]))
  }
  printPlanned(`write ${file}`)
}

/** Sends the queries, or prints them with `--dry-run` without reading credentials; returns the written file or null. */
export async function runAnalytics(
  options: AnalyticsOptions,
  env: Readonly<Record<string, string | undefined>> = process.env,
  now: () => Date = () => new Date(),
): Promise<string | null> {
  const measuredAt = now()
  const file = outputPath('analytics', options, measuredAt)
  if (options.dryRun) {
    planAnalytics(options, file)
    return null
  }
  const { token, accountId } = credentials(env)
  const results: Record<string, unknown> = {}
  for (const query of plannedQueries(options, accountId))
    results[query.key] = query.parse(await postGraphql(query.body, token))
  const targets = { script: options.script, databaseId: options.databaseId, bucket: options.bucket }
  const meta = { measuredAt: measuredAt.toISOString(), window: options.window, targets }
  writeJson(file, {
    metric: 'analytics',
    env: options.env,
    ...meta,
    endpoint: GRAPHQL_ENDPOINT,
    docs: GRAPHQL_DOCS,
    ...results,
  })
  console.log(`analytics: ${JSON.stringify(results)}`)
  console.log(`analytics: wrote ${file}`)
  return file
}

if (isMain(import.meta.url)) runCli(() => runAnalytics(parseAnalyticsOptions(process.argv.slice(2))))
