import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { isMain } from './lib/report'

const OUTPUTS = ['worker.js', 'server-functions/default/handler.mjs']
const REPORT_PATH = 'docs/reports/size.json'
const MAX_GROWTH = 0.2

/** Byte sizes of the OpenNext outputs, as stored in `docs/reports/size.json`. */
export interface SizeRecord {
  readonly files: Readonly<Record<string, number>>
  readonly totalBytes: number
}

/** Options for {@link checkSize}. */
export interface SizeOptions {
  readonly root: string
  /** OpenNext output directory, relative to `root` unless absolute. */
  readonly build: string
  readonly write: boolean
  readonly allowGrowth: boolean
}

/** Measures `worker.js` plus `handler.mjs` when present in `buildDir`; null when `worker.js` is absent. */
export function measure(buildDir: string): SizeRecord | null {
  if (!existsSync(join(buildDir, 'worker.js'))) return null
  const present = OUTPUTS.filter((file) => existsSync(join(buildDir, file)))
  const files = Object.fromEntries(present.map((file) => [file, statSync(join(buildDir, file)).size]))
  return { files, totalBytes: Object.values(files).reduce((sum, bytes) => sum + bytes, 0) }
}

/** Reads the committed `totalBytes` baseline below `root`; null when there is none. */
export function readBaseline(root: string): number | null {
  const path = join(root, REPORT_PATH)
  if (!existsSync(path)) return null
  const data: unknown = JSON.parse(readFileSync(path, 'utf8'))
  const total = typeof data === 'object' && data !== null ? (data as { totalBytes?: unknown }).totalBytes : undefined
  return typeof total === 'number' ? total : null
}

/** Returns a failure message when `total` exceeds `baseline` by more than 20%; null otherwise or without a baseline. */
export function growthFailure(total: number, baseline: number | null): string | null {
  if (baseline === null || baseline <= 0 || total <= baseline * (1 + MAX_GROWTH)) return null
  const percent = (((total - baseline) / baseline) * 100).toFixed(1)
  return `check:size: ${String(total)} bytes is +${percent}% over the committed ${String(baseline)} bytes (limit +20%); rerun with --allow-growth and cite an ADR`
}

/** Runs the size check, writing the report only when `options.write` is set and the check passes; returns the exit code. */
export function checkSize(options: SizeOptions): number {
  const record = measure(resolve(options.root, options.build))
  if (record === null) {
    console.log(`check:size: no build output at ${options.build}/worker.js; nothing to measure`)
    return 0
  }
  const baseline = readBaseline(options.root)
  const committed = baseline === null ? 'none' : String(baseline)
  console.log(`check:size: ${String(record.totalBytes)} bytes (committed: ${committed})`)
  const failure = options.allowGrowth ? null : growthFailure(record.totalBytes, baseline)
  if (failure !== null) {
    console.error(failure)
    return 1
  }
  if (options.write) {
    mkdirSync(dirname(join(options.root, REPORT_PATH)), { recursive: true })
    writeFileSync(join(options.root, REPORT_PATH), `${JSON.stringify(record, null, 2)}\n`)
  }
  return 0
}

if (isMain(import.meta.url)) {
  const [text, flag] = [{ type: 'string' }, { type: 'boolean', default: false }] as const
  const { values: v } = parseArgs({ options: { root: text, build: text, write: flag, 'allow-growth': flag } })
  const [root, build] = [v.root ?? process.cwd(), v.build ?? 'apps/web/.open-next']
  process.exitCode = checkSize({ root, build, write: v.write, allowGrowth: v['allow-growth'] })
}
