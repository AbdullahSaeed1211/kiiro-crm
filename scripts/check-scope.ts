import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { CRITICAL_PATHS } from './lib/critical-paths'
import { isMain } from './lib/report'
import { escapeRegExp } from './lib/scan'

/** The fields of a milestone plan row that check:scope needs. */
export interface PlanRow {
  readonly owner: string
  readonly scope: readonly string[]
}

/** Critical-path failures and out-of-scope flags for a set of changed paths. */
export interface ScopeResult {
  readonly failures: readonly string[]
  readonly flags: readonly string[]
}

/** Options for {@link runScope}. */
export interface ScopeOptions {
  readonly root: string
  readonly wp: string
  /** Milestone branch to diff against; defaults to the current branch's upstream. */
  readonly base?: string | undefined
  /** File listing changed paths one per line, used instead of git. */
  readonly files?: string | undefined
}

const GLOB_TOKENS: Readonly<Record<string, string>> = { '**/': '(?:.*/)?', '**': '.*', '*': '[^/]*' }

const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())

/** Returns the milestone number of a WP ID such as `M0-W1`, or null for a malformed ID. */
export function milestoneOf(wp: string): string | null {
  return /^M(\d+)-/.exec(wp)?.[1] ?? null
}

/** Splits a write-scope cell on `;`, stripping backticks and empty entries. */
export function parseScope(cell: string): string[] {
  return cell
    .split(';')
    .map((entry) => entry.replaceAll('`', '').trim())
    .filter((entry) => entry !== '' && entry !== '—')
}

/** Finds the row for `wp` in a plan's markdown table (columns located by the `WP`, `Owner` and `Write scope` headers). */
export function findPlanRow(markdown: string, wp: string): PlanRow | null {
  const rows = markdown
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map(cells)
  const header = rows.find((row) => row.includes('WP') && row.includes('Write scope'))
  if (header === undefined) return null
  const row = rows.find((candidate) => candidate[header.indexOf('WP')] === wp)
  if (row === undefined) return null
  return { owner: row[header.indexOf('Owner')] ?? '', scope: parseScope(row[header.indexOf('Write scope')] ?? '') }
}

/** True when `path` is covered by `pattern`: a trailing `/` is a directory, `*` matches within a segment, `**` across segments. */
export function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith('/')) return path.startsWith(pattern)
  if (!pattern.includes('*')) return path === pattern
  const source = pattern
    .split(/(\*\*\/|\*\*|\*)/)
    .map((part) => GLOB_TOKENS[part] ?? escapeRegExp(part))
    .join('')
  return new RegExp(`^${source}$`).test(path)
}

/** True for the paths every WP may touch: its attempt metrics and its own report. */
export function isAlwaysAllowed(path: string, wp: string): boolean {
  const report = `docs/orchestration/m${milestoneOf(wp) ?? ''}/reports/${wp}.md`
  return path === report || matchesPattern(path, `harness/metrics/attempts/${wp}-a*.json`)
}

/** Fails critical paths touched by a non-lead WP and flags paths outside the row's write scope. */
export function classifyPaths(paths: readonly string[], wp: string, row: PlanRow): ScopeResult {
  const isCritical = (path: string): boolean => CRITICAL_PATHS.some((critical) => matchesPattern(path, critical))
  const failures = row.owner.toLowerCase() === 'lead' ? [] : paths.filter(isCritical)
  const inScope = (path: string): boolean =>
    isAlwaysAllowed(path, wp) || row.scope.some((entry) => matchesPattern(path, entry))
  return { failures, flags: paths.filter((path) => !failures.includes(path) && !inScope(path)) }
}

/** Lists paths changed on HEAD since it forked from `base`, defaulting to the current branch's upstream. */
export function changedPaths(root: string, base?: string): string[] {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- git comes from the developer or CI PATH like every other tool
  const git = (args: string[]): string => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  const target = base ?? git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])
  return git(['diff', '--name-only', `${target}...HEAD`])
    .split('\n')
    .filter((line) => line !== '')
}

const readLines = (file: string): string[] =>
  readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

/** Loads the plan row for `wp` below `root`; null when the WP ID, plan file or row is missing. */
export function loadPlanRow(root: string, wp: string): PlanRow | null {
  const plan = join(root, `docs/orchestration/m${milestoneOf(wp) ?? 'X'}/plan.md`)
  return existsSync(plan) ? findPlanRow(readFileSync(plan, 'utf8'), wp) : null
}

/** Runs check:scope, printing `FAIL` and `FLAG` lines; returns 1 when a critical path is touched, else 0. */
export function runScope(options: ScopeOptions): number {
  const row = loadPlanRow(options.root, options.wp)
  if (row === null) {
    console.error(`check:scope: no plan row for "${options.wp}" (usage: check:scope <WP-ID> [--base <branch>])`)
    return 1
  }
  const paths = options.files === undefined ? changedPaths(options.root, options.base) : readLines(options.files)
  const { failures, flags } = classifyPaths(paths, options.wp, row)
  for (const path of failures) console.error(`FAIL ${path} (critical path, lead-owned)`)
  for (const path of flags) console.log(`FLAG ${path} (outside write scope)`)
  const summary = `${String(paths.length)} changed, ${String(failures.length)} failed, ${String(flags.length)} flagged`
  console.log(`check:scope: ${options.wp} ${summary}`)
  return failures.length === 0 ? 0 : 1
}

if (isMain(import.meta.url)) {
  const options = {
    root: { type: 'string', default: process.cwd() },
    base: { type: 'string' },
    files: { type: 'string' },
  } as const
  const { values, positionals } = parseArgs({ options, allowPositionals: true })
  try {
    process.exitCode = runScope({ root: values.root, wp: positionals[0] ?? '', base: values.base, files: values.files })
  } catch (error) {
    console.error(`check:scope: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
