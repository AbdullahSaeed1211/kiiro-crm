import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

/** Repository root derived from this file's location (`scripts/harness/lib/`). */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

const WP_PATTERN = /^M(\d+)-[LWX]\d+[a-z]?$/

/** Parses a WP id such as `M0-W3`; throws on malformed ids. */
export function milestoneOf(wp: string): { milestone: string; number: number; lower: string } {
  const match = WP_PATTERN.exec(wp)
  if (match?.[1] === undefined) throw new Error(`invalid WP id "${wp}" (expected M<N>-<L|W|X><k>)`)
  const number = Number.parseInt(match[1], 10)
  return { milestone: `M${String(number)}`, number, lower: `m${String(number)}` }
}

/** Parses a milestone argument such as `m1` or `M1`. */
export function parseMilestoneArg(arg: string | undefined): number {
  const match = /^[mM](\d+)$/.exec(arg ?? '')
  if (match?.[1] === undefined) throw new Error(`expected a milestone argument like m1, got "${arg ?? ''}"`)
  return Number.parseInt(match[1], 10)
}

/** Parses `m<N> [--dry-run]`, the argument shape shared by plan and retro. */
export function parseMilestoneCommand(argv: string[]): { n: number; dryRun: boolean } {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { 'dry-run': { type: 'boolean', default: false } },
  })
  return { n: parseMilestoneArg(positionals[0]), dryRun: values['dry-run'] }
}

export const paths = {
  spec: (root: string): string => join(root, 'docs', 'spec.md'),
  plan: (root: string, n: number): string => join(root, 'docs', 'orchestration', `m${String(n)}`, 'plan.md'),
  brief: (root: string, wp: string): string =>
    join(root, 'docs', 'orchestration', milestoneOf(wp).lower, 'briefs', `${wp}.md`),
  attempts: (root: string): string => join(root, 'harness', 'metrics', 'attempts'),
  lessons: (root: string): string => join(root, 'harness', 'lessons'),
  evals: (root: string): string => join(root, 'harness', 'evals'),
  selftest: (root: string): string => join(root, 'harness', 'selftest'),
  config: (root: string): string => join(root, 'harness', 'config.yaml'),
  template: (root: string, name: string): string => join(root, 'harness', 'templates', `${name}.md`),
}

export function readText(file: string): string {
  return readFileSync(file, 'utf8')
}

/** Lists file names in a directory, or an empty list when it does not exist. */
export function listDir(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).sort((a, b) => a.localeCompare(b)) : []
}

/** Lists files named `name` anywhere below `dir`. */
export function findFiles(dir: string, name: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((rel) => rel === name || rel.endsWith(`/${name}`))
    .map((rel) => join(dir, rel))
    .sort((a, b) => a.localeCompare(b))
}

/** True when the module at `metaUrl` is the process entry point. */
export function isMain(metaUrl: string): boolean {
  const entry = process.argv[1]
  return entry !== undefined && pathToFileURL(resolve(entry)).href === metaUrl
}

/** Runs an async CLI entry and maps its result (or a thrown error) to the process exit code. */
export function runCli(main: (argv: string[]) => Promise<number>): void {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 2
    },
  )
}

/** `YYYYMMDD` for a date in UTC. */
export function compactDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '')
}
