import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createShellRunner, stripAnsi, type CommandResult, type CommandRunner } from './lib/exec.ts'
import { evalManifestPath, loadLessons } from './lib/lessons.ts'
import { findFiles, isMain, paths, readText, REPO_ROOT, runCli } from './lib/repo.ts'
import { loadSchema, validate } from './lib/schema.ts'

interface EvalStep {
  cwd: string
  command: string
  expectExitCode: 'zero' | 'nonzero'
  expectOutput?: string
}

interface EvalManifest {
  lesson: string
  repro: EvalStep
  fixed: EvalStep
}

export interface EvalTarget {
  label: string
  manifest: string
}

export interface EvalsOptions {
  root: string
  run: CommandRunner
  log?: ((line: string) => void) | undefined
}

/** Eval manifests of every active lesson, plus every `eval.json` under `harness/selftest/`. */
export function evalTargets(root: string): { targets: EvalTarget[]; errors: string[] } {
  const { lessons, errors } = loadLessons(root)
  const lessonTargets = lessons
    .filter((lesson) => lesson.status === 'active')
    .map((lesson) => ({ label: lesson.id, manifest: evalManifestPath(root, lesson.eval) }))
  const selftestDir = paths.selftest(root)
  const selftestTargets = findFiles(selftestDir, 'eval.json').map((manifest) => ({
    label: `selftest/${relative(selftestDir, manifest)}`,
    manifest,
  }))
  return { targets: [...lessonTargets, ...selftestTargets], errors: errors.map((e) => `invalid lesson ${e}`) }
}

/** Why a step result does not meet its expectation, or undefined when it does. `fixed` must always exit zero. */
export function stepMismatch(opts: {
  role: 'repro' | 'fixed'
  step: EvalStep
  result: CommandResult
}): string | undefined {
  const { role, step, result } = opts
  if (role === 'fixed' && step.expectExitCode !== 'zero') return 'fixed step must expect exit code zero'
  const exitOk = step.expectExitCode === 'zero' ? result.exitCode === 0 : result.exitCode !== 0
  if (!exitOk) return `exit ${String(result.exitCode)}, expected ${step.expectExitCode}`
  const expected = step.expectOutput
  if (expected !== undefined && !stripAnsi(result.output).includes(expected))
    return `output does not contain "${expected}"`
  return undefined
}

function loadManifest(root: string, target: EvalTarget): EvalManifest {
  if (!existsSync(target.manifest)) throw new Error(`missing ${relative(root, target.manifest)}`)
  const data: unknown = JSON.parse(readText(target.manifest))
  const problems = validate(loadSchema(root, 'eval'), data)
  if (problems.length > 0) throw new Error(`invalid ${relative(root, target.manifest)}: ${problems.join('; ')}`)
  return data as EvalManifest
}

async function runStep(opts: {
  role: 'repro' | 'fixed'
  step: EvalStep
  ctx: EvalsOptions
}): Promise<string | undefined> {
  const cwd = join(opts.ctx.root, opts.step.cwd)
  if (!existsSync(cwd)) return `cwd ${opts.step.cwd} does not exist`
  const result = await opts.ctx.run({ command: opts.step.command, cwd })
  return stepMismatch({ role: opts.role, step: opts.step, result })
}

/** Runs repro then fixed for one target; returns failure messages (empty when both behave). */
export async function runTarget(target: EvalTarget, ctx: EvalsOptions): Promise<string[]> {
  let manifest: EvalManifest
  try {
    manifest = loadManifest(ctx.root, target)
  } catch (error) {
    return [`${target.label}: ${error instanceof Error ? error.message : String(error)}`]
  }
  const failures: string[] = []
  for (const role of ['repro', 'fixed'] as const) {
    const mismatch = await runStep({ role, step: manifest[role], ctx })
    const subject = `${target.label} ${role}`
    if (mismatch === undefined) {
      ctx.log?.(`PASS ${subject}`)
    } else {
      ctx.log?.(`FAIL ${subject}: ${mismatch}`)
      failures.push(`${subject}: ${mismatch}`)
    }
  }
  return failures
}

/** Runs every eval; returns 1 when any step mismatches or a manifest or lesson is invalid. */
export async function runEvals(opts: EvalsOptions): Promise<number> {
  const log =
    opts.log ??
    ((line: string): void => {
      console.log(line)
    })
  const { targets, errors } = evalTargets(opts.root)
  const failures = [...errors]
  for (const target of targets) failures.push(...(await runTarget(target, { ...opts, log })))
  if (targets.length === 0) log('no active lesson evals or self-test manifests found')
  failures.forEach((failure) => {
    log(`error: ${failure}`)
  })
  log(`${String(targets.length)} eval target(s), ${String(failures.length)} failure(s)`)
  return failures.length > 0 ? 1 : 0
}

if (isMain(import.meta.url)) runCli(() => runEvals({ root: REPO_ROOT, run: createShellRunner({ root: REPO_ROOT }) }))
