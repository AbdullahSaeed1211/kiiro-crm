import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parseArgs } from 'node:util'
import {
  attemptFileName,
  isFailure,
  isUnavailable,
  UNAVAILABLE_EXIT,
  UNAVAILABLE_PREFIX,
  type Attempt,
  type Gate,
} from './lib/attempts.ts'
import { loadConfig } from './lib/config.ts'
import { createShellRunner, type CommandRunner } from './lib/exec.ts'
import {
  acceptanceCommands,
  failingLines,
  parseScopeViolations,
  readScripts,
  SCOPE_GATE,
  suggestClasses,
  unavailableReason,
  verifyFastGates,
  type GateRun,
  type GateSpec,
} from './lib/gates.ts'
import { assertSafeRef, changedFiles, detectMilestoneBranch } from './lib/git.ts'
import { loadPlanRow } from './lib/plan-rows.ts'
import { isMain, milestoneOf, paths, REPO_ROOT, runCli } from './lib/repo.ts'
import { assertValid } from './lib/schema.ts'

export interface RecordOptions {
  root: string
  wp: string
  attempt: number
  runner: Attempt['runner']
  run: CommandRunner
  base?: string | undefined
  force?: boolean | undefined
  tookOver?: boolean | undefined
  now?: (() => Date) | undefined
}

export interface RecordResult {
  file: string
  data: Attempt
  failed: Gate[]
}

/** Acceptance commands from the plan row, `verify:fast` steps, then `check:scope`. */
export function planGates(opts: { root: string; wp: string; base: string | undefined }): GateSpec[] {
  const acceptance = acceptanceCommands(loadPlanRow(opts.root, opts.wp).row.acceptance)
  const baseArg = opts.base === undefined ? '' : ` --base ${assertSafeRef(opts.base)}`
  return [
    ...acceptance.map((command) => ({ name: command, command })),
    ...verifyFastGates(readScripts(opts.root)),
    { name: SCOPE_GATE, command: `pnpm ${SCOPE_GATE} ${opts.wp}${baseArg}` },
  ]
}

async function runGate(spec: GateSpec, ctx: { root: string; run: CommandRunner }): Promise<GateRun> {
  const reason = unavailableReason({ root: ctx.root, command: spec.command, scripts: readScripts(ctx.root) })
  if (reason !== undefined) {
    const note = `${UNAVAILABLE_PREFIX} \`${spec.command}\` could not run (${reason})`
    return { name: spec.name, exitCode: UNAVAILABLE_EXIT, durationMs: 0, failingLines: [note], output: '' }
  }
  const result = await ctx.run({ command: spec.command, cwd: ctx.root })
  return {
    name: spec.name,
    exitCode: result.exitCode,
    durationMs: Math.max(0, Math.round(result.durationMs)),
    failingLines: result.exitCode === 0 ? [] : failingLines(result.output),
    output: result.output,
  }
}

async function runGates(specs: GateSpec[], ctx: { root: string; run: CommandRunner }): Promise<GateRun[]> {
  const results: GateRun[] = []
  for (const spec of specs) results.push(await runGate(spec, ctx))
  return results
}

function scopeViolationsOf(gates: GateRun[]): string[] {
  const scope = gates.find((gate) => gate.name === SCOPE_GATE)
  return scope === undefined || isUnavailable(scope) ? [] : parseScopeViolations(scope.output)
}

/** Target attempt file; refuses to overwrite an existing one unless forced (paths are runner-specific). */
function targetFile(opts: RecordOptions): string {
  const file = join(paths.attempts(opts.root), attemptFileName(opts))
  if (existsSync(file) && opts.force !== true) {
    throw new Error(`${relative(opts.root, file)} exists; attempt files are never overwritten (use the next --attempt)`)
  }
  return file
}

function buildAttempt(input: {
  opts: RecordOptions
  runs: GateRun[]
  times: { startedAt: string; finishedAt: string }
  filesChanged: number
}): Attempt {
  const { opts, runs } = input
  const gates: Gate[] = runs.map(({ name, exitCode, durationMs, failingLines: lines }) => ({
    ...{ name, exitCode, durationMs },
    failingLines: lines,
  }))
  const scopeViolations = scopeViolationsOf(runs)
  const { gateClassMap } = loadConfig(opts.root)
  return {
    ...{ wp: opts.wp, milestone: milestoneOf(opts.wp).milestone, attempt: opts.attempt, runner: opts.runner },
    ...{ ...input.times, gates, scopeViolations, filesChanged: input.filesChanged },
    ...{ suggestedClasses: suggestClasses({ gates, scopeViolations, gateClassMap }), confirmedClasses: [] },
    leadTookOver: opts.tookOver === true,
  }
}

/** Runs every gate and writes `harness/metrics/attempts/<WP-ID>-a<k>[-lead].json`; never overwrites unless forced. */
export async function recordAttempt(opts: RecordOptions): Promise<RecordResult> {
  const file = targetFile(opts)
  const now = opts.now ?? ((): Date => new Date())
  const startedAt = now().toISOString()
  const number = milestoneOf(opts.wp).number
  const base = opts.base ?? (await detectMilestoneBranch({ root: opts.root, number, run: opts.run }))
  const runs = await runGates(planGates({ root: opts.root, wp: opts.wp, base }), opts)
  const changed = base === undefined ? undefined : await changedFiles({ root: opts.root, base, run: opts.run })
  const times = { startedAt, finishedAt: now().toISOString() }
  const data = buildAttempt({ opts, runs, times, filesChanged: changed?.length ?? 0 })
  assertValid({ root: opts.root, name: 'attempt', label: relative(opts.root, file) }, data)
  mkdirSync(paths.attempts(opts.root), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
  return { file, data, failed: data.gates.filter(isFailure) }
}

function gateLabel(gate: Gate): string {
  if (isUnavailable(gate)) return 'SKIP'
  return gate.exitCode === 0 ? 'PASS' : 'FAIL'
}

function printSummary(result: RecordResult, root: string): void {
  for (const gate of result.data.gates) {
    console.log(`${gateLabel(gate)} ${gate.name} (exit ${String(gate.exitCode)}, ${String(gate.durationMs)} ms)`)
    gate.failingLines.forEach((line) => {
      console.log(`    ${line}`)
    })
  }
  console.log(`suggestedClasses: ${result.data.suggestedClasses.join(', ') || 'none'}`)
  console.log(`wrote ${relative(root, result.file)}`)
}

function parseRunner(value: string): Attempt['runner'] {
  if (value !== 'worker' && value !== 'lead') throw new Error(`--runner must be worker or lead, got "${value}"`)
  return value
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      attempt: { type: 'string' },
      runner: { type: 'string', default: 'worker' },
      base: { type: 'string' },
      force: { type: 'boolean', default: false },
      'took-over': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
    },
  })
  const attempt = Number.parseInt(values.attempt ?? '', 10)
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error('usage: harness:record <WP-ID> --attempt <k>')
  const result = await recordAttempt({
    ...{ root: REPO_ROOT, wp: positionals[0] ?? '', attempt, runner: parseRunner(values.runner) },
    ...{ base: values.base, force: values.force, tookOver: values['took-over'] },
    run: createShellRunner({ root: REPO_ROOT, echo: values.verbose }),
  })
  printSummary(result, REPO_ROOT)
  return result.failed.length > 0 ? 1 : 0
}

if (isMain(import.meta.url)) runCli(main)
