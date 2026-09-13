import { parseArgs } from 'node:util'
import { isMain } from '../lib/report'
import { COMMON_OPTIONS, commonOptions, httpUrl, intFlag, requireFlag, runCli, UsageError } from './lib/cli'
import type { CommonOptions } from './lib/cli'
import { CLIENT_TIMERS, curlCommand, formatRequest, redactHeaders, timeAccepted } from './lib/http'
import type { Client, RequestSpec, Timing } from './lib/http'
import { outputPath, printPlanned, writeJson } from './lib/output'
import { formatCommand } from './lib/process'
import { PERCENTILE_METHOD, summarize, type Summary } from './lib/stats'

/** Options for {@link runLatency}. */
export interface LatencyOptions extends CommonOptions {
  readonly baseUrl: string
  readonly paths: readonly string[]
  readonly count: number
  readonly cold: boolean
  readonly client: Client
  readonly method: string
  readonly headers: Readonly<Record<string, string>>
  readonly body: string | undefined
}

/** Warm samples of one path, in request order. */
export interface PathResult {
  readonly path: string
  readonly count: number
  readonly statusCounts: Readonly<Record<string, number>>
  readonly summaryMs: Summary | null
  readonly samplesMs: readonly number[]
}

/** The JSON file written by {@link runLatency}; header values are never recorded. */
export interface LatencyRecord {
  readonly metric: 'latency'
  readonly env: string
  readonly startedAt: string
  readonly finishedAt: string
  readonly baseUrl: string
  readonly client: Client
  readonly timer: string
  readonly method: string
  readonly headerNames: readonly string[]
  readonly countPerPath: number
  readonly percentileMethod: string
  readonly cold: (Timing & { readonly path: string }) | null
  readonly paths: readonly PathResult[]
}

const text = { type: 'string' } as const
const LATENCY_ARGS = {
  ...COMMON_OPTIONS,
  'base-url': text,
  path: { type: 'string', multiple: true },
  count: text,
  cold: { type: 'boolean', default: false },
  client: text,
  method: text,
  header: { type: 'string', multiple: true },
  data: text,
} as const

/** Splits a `Name: value` header flag. */
export function parseHeader(raw: string): [string, string] {
  const colon = raw.indexOf(':')
  const name = colon > 0 ? raw.slice(0, colon).trim() : ''
  if (name === '') throw new UsageError(`--header must look like "Name: value", got "${raw}"`)
  return [name, raw.slice(colon + 1).trim()]
}

function parseClient(raw: string | undefined): Client {
  if (raw === undefined || raw === 'curl' || raw === 'fetch') return raw ?? 'curl'
  throw new UsageError(`--client must be curl or fetch, got "${raw}"`)
}

function parsePaths(raw: readonly string[] | undefined): readonly string[] {
  const paths = raw ?? []
  if (paths.length === 0 || paths.some((path) => !path.startsWith('/'))) {
    throw new UsageError('--path is required, may be repeated, and must start with /')
  }
  return paths
}

/** Parses and validates the command line. */
export function parseLatencyOptions(argv: readonly string[]): LatencyOptions {
  const { values } = parseArgs({ args: [...argv], options: LATENCY_ARGS })
  const count = intFlag('--count', values.count, { fallback: 200, min: 0 })
  if (count === 0 && !values.cold) throw new UsageError('--count 0 measures nothing without --cold')
  const baseUrl = httpUrl(requireFlag(values['base-url'], '--base-url'), '--base-url')
  return {
    ...commonOptions(values),
    baseUrl: baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl,
    paths: parsePaths(values.path),
    count,
    cold: values.cold,
    client: parseClient(values.client),
    method: (values.method ?? 'GET').toUpperCase(),
    headers: Object.fromEntries((values.header ?? []).map(parseHeader)),
    body: values.data,
  }
}

const requestFor = (options: LatencyOptions, path: string): RequestSpec => {
  return { method: options.method, url: `${options.baseUrl}${path}`, headers: options.headers, body: options.body }
}

/** Warm result for one path from its timed samples. */
export function pathResult(path: string, samples: readonly Timing[]): PathResult {
  const samplesMs = samples.map((sample) => sample.ms)
  const statusCounts: Record<string, number> = {}
  for (const { status } of samples) statusCounts[String(status)] = (statusCounts[String(status)] ?? 0) + 1
  const summaryMs = samplesMs.length === 0 ? null : summarize(samplesMs)
  return { path, count: samples.length, statusCounts, summaryMs, samplesMs }
}

async function measurePath(options: LatencyOptions, path: string): Promise<PathResult> {
  const request = requestFor(options, path)
  const samples: Timing[] = []
  for (let index = 0; index < options.count; index += 1) samples.push(await timeAccepted(request, options.client))
  return pathResult(path, samples)
}

async function coldSample(options: LatencyOptions): Promise<LatencyRecord['cold']> {
  const [path] = options.paths
  if (!options.cold || path === undefined) return null
  return { path, ...(await timeAccepted(requestFor(options, path), options.client)) }
}

function planLatency(options: LatencyOptions, file: string): void {
  const describe = (path: string): string => {
    const request = requestFor(options, path)
    return options.client === 'curl' ? formatCommand(curlCommand(redactHeaders(request))) : formatRequest(request, [])
  }
  const [first] = options.paths
  if (options.cold && first !== undefined) printPlanned(`cold, 1 request: ${describe(first)}`)
  for (const path of options.paths) {
    if (options.count > 0) printPlanned(`warm, ${String(options.count)} sequential requests: ${describe(path)}`)
  }
  printPlanned(`write ${file}`)
}

function printResults(record: LatencyRecord, file: string): void {
  const { cold } = record
  if (cold !== null) console.log(`latency: cold ${cold.path} ${String(cold.ms)} ms (status ${String(cold.status)})`)
  for (const { path, summaryMs, count } of record.paths) {
    if (summaryMs === null) continue
    console.log(
      `latency: ${path} p50 ${String(summaryMs.p50)} ms, p95 ${String(summaryMs.p95)} ms (${String(count)} requests)`,
    )
  }
  console.log(`latency: wrote ${file}`)
}

/** Runs the requests, or prints them with `--dry-run`; returns the written file, or null in dry-run. */
export async function runLatency(options: LatencyOptions, now: () => Date = () => new Date()): Promise<string | null> {
  const startedAt = now()
  const file = outputPath('latency', options, startedAt)
  if (options.dryRun) {
    planLatency(options, file)
    return null
  }
  const cold = await coldSample(options)
  const paths: PathResult[] = []
  for (const path of options.paths) paths.push(await measurePath(options, path))
  const record: LatencyRecord = {
    metric: 'latency',
    env: options.env,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    client: options.client,
    timer: CLIENT_TIMERS[options.client],
    method: options.method,
    headerNames: Object.keys(options.headers),
    countPerPath: options.count,
    percentileMethod: PERCENTILE_METHOD,
    cold,
    paths,
  }
  writeJson(file, record)
  printResults(record, file)
  return file
}

if (isMain(import.meta.url)) runCli(() => runLatency(parseLatencyOptions(process.argv.slice(2))))
