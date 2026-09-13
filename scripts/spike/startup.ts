import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { isMain } from '../lib/report'
import { COMMON_OPTIONS, commonOptions, httpUrl, intFlag, runCli, UsageError, type CommonOptions } from './lib/cli'
import { CLIENT_TIMERS, timeAccepted, type Timing } from './lib/http'
import { outputPath, printPlanned, writeJson } from './lib/output'
import { formatCommand, runCommand, type CommandSpec } from './lib/process'
import { PERCENTILE_METHOD, summarize } from './lib/stats'

// Wording from wrangler 4.131.1 (wrangler-dist/cli.js): logger.log("Worker Startup Time:", result.startup_time_ms, "ms").
const STARTUP_LINE = /Worker Startup Time:\s*(\d+(?:\.\d+)?)\s*ms/
const VERSION_LINE = /Worker Version ID:\s*([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})/i

/** Options for {@link runStartup}. */
export interface StartupOptions extends CommonOptions {
  readonly count: number
  readonly filter: string
  readonly deploy: boolean
  readonly coldUrl: string | undefined
  readonly settleMs: number
}

/** One upload: reported startup time, version id and, with `--cold-url`, the first request after deploying it. */
export interface StartupRun {
  readonly run: number
  readonly startupTimeMs: number
  readonly versionId: string | null
  readonly cold?: Timing
}

/** Startup time from Wrangler's `Worker Startup Time: <n> ms` line; null when absent or not a number. */
export function parseStartupTime(output: string): number | null {
  const value = STARTUP_LINE.exec(output)?.[1]
  return value === undefined ? null : Number(value)
}

/** Version id from Wrangler's `Worker Version ID: <uuid>` line; null when absent. */
export function parseVersionId(output: string): string | null {
  return VERSION_LINE.exec(output)?.[1] ?? null
}

/** `pnpm --filter <filter> exec wrangler versions <args> --env <env>`. */
export function wranglerCommand(options: Pick<StartupOptions, 'filter' | 'env'>, args: readonly string[]): CommandSpec {
  return {
    file: 'pnpm',
    args: ['--filter', options.filter, 'exec', 'wrangler', 'versions', ...args, '--env', options.env],
  }
}

const deployArgs = (versionId: string, run: number): string[] => {
  return ['deploy', `${versionId}@100%`, '--yes', '--message', `startup measurement run ${String(run)}`]
}

/** Parses and validates the command line. */
export function parseStartupOptions(argv: readonly string[]): StartupOptions {
  const text = { type: 'string' } as const
  const options = { ...COMMON_OPTIONS, count: text, filter: text, 'cold-url': text, 'settle-ms': text }
  const { values } = parseArgs({
    args: [...argv],
    options: { ...options, deploy: { type: 'boolean', default: false } },
  })
  const coldUrl = values['cold-url']
  if (coldUrl !== undefined && !values.deploy) {
    throw new UsageError('--cold-url needs --deploy, so the cold request reaches the uploaded version')
  }
  return {
    ...commonOptions(values),
    count: intFlag('--count', values.count, { fallback: 5, min: 1 }),
    filter: values.filter ?? 'web',
    deploy: values.deploy,
    coldUrl: coldUrl === undefined ? undefined : httpUrl(coldUrl, '--cold-url'),
    settleMs: intFlag('--settle-ms', values['settle-ms'], { fallback: 15_000, min: 0 }),
  }
}

function planRun(options: StartupOptions, run: number): void {
  const label = `run ${String(run)}:`
  printPlanned(`${label} ${formatCommand(wranglerCommand(options, ['upload']))}`)
  if (!options.deploy) return
  const placeholder = `<version-id-of-run-${String(run)}>`
  printPlanned(`${label} ${formatCommand(wranglerCommand(options, deployArgs(placeholder, run)))}`)
  if (options.coldUrl === undefined) return
  printPlanned(`${label} wait ${String(options.settleMs)} ms, then GET ${options.coldUrl} once (cold request, fetch)`)
}

function runChecked(command: CommandSpec, label: string): string {
  const result = runCommand(command)
  process.stdout.write(result.output)
  if (result.code !== 0) throw new Error(`${label}: ${formatCommand(command)} exited ${String(result.code)}`)
  return result.output
}

async function executeRun(options: StartupOptions, run: number): Promise<StartupRun> {
  const label = `run ${String(run)}`
  const output = runChecked(wranglerCommand(options, ['upload']), label)
  const startupTimeMs = parseStartupTime(output)
  if (startupTimeMs === null) throw new Error(`${label}: no "Worker Startup Time: <n> ms" line in the upload output`)
  const measured = { run, startupTimeMs, versionId: parseVersionId(output) }
  if (!options.deploy) return measured
  if (measured.versionId === null) throw new Error(`${label}: no "Worker Version ID:" line, cannot deploy the version`)
  runChecked(wranglerCommand(options, deployArgs(measured.versionId, run)), label)
  if (options.coldUrl === undefined) return measured
  await sleep(options.settleMs)
  return { ...measured, cold: await timeAccepted({ method: 'GET', url: options.coldUrl, headers: {} }, 'fetch') }
}

const range = (values: readonly number[]): Record<string, number> => {
  const summary = summarize(values)
  return { count: summary.count, min: summary.min, median: summary.p50, max: summary.max }
}

/** The JSON record written for finished runs. */
export function startupRecord(options: StartupOptions, runs: readonly StartupRun[], startedAt: Date): object {
  const colds = runs.flatMap((run) => (run.cold === undefined ? [] : [run.cold.ms]))
  const cold =
    colds.length === 0 ? {} : { coldMs: range(colds), coldTimer: CLIENT_TIMERS.fetch, coldUrl: options.coldUrl }
  return {
    metric: 'startup',
    env: options.env,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    source: 'wrangler versions upload output line "Worker Startup Time: <n> ms"',
    command: formatCommand(wranglerCommand(options, ['upload'])),
    percentileMethod: PERCENTILE_METHOD,
    startupTimeMs: range(runs.map((run) => run.startupTimeMs)),
    ...cold,
    ...(options.deploy ? { settleMs: options.settleMs } : {}),
    runs,
  }
}

/** Runs the uploads, or prints them with `--dry-run`; returns the written file, or null in dry-run. */
export async function runStartup(options: StartupOptions, now: () => Date = () => new Date()): Promise<string | null> {
  const startedAt = now()
  const file = outputPath('startup', options, startedAt)
  const runNumbers = Array.from({ length: options.count }, (_, index) => index + 1)
  if (options.dryRun) {
    for (const run of runNumbers) planRun(options, run)
    printPlanned(`write ${file}`)
    return null
  }
  const runs: StartupRun[] = []
  for (const run of runNumbers) runs.push(await executeRun(options, run))
  writeJson(file, startupRecord(options, runs, startedAt))
  const summary = range(runs.map((run) => run.startupTimeMs))
  console.log(`startup: startup_time_ms ${JSON.stringify(summary)}; wrote ${file}`)
  return file
}

if (isMain(import.meta.url)) runCli(() => runStartup(parseStartupOptions(process.argv.slice(2))))
