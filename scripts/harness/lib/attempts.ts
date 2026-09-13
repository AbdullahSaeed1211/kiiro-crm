import { join } from 'node:path'
import { listDir, paths, readText } from './repo.ts'
import { loadSchema, validate } from './schema.ts'

export interface Gate {
  name: string
  exitCode: number
  durationMs: number
  failingLines: string[]
}

/** Attempt file shape (`harness/schemas/attempt.schema.json`). */
export interface Attempt {
  wp: string
  milestone: string
  attempt: number
  runner: 'worker' | 'lead'
  startedAt: string
  finishedAt: string
  gates: Gate[]
  scopeViolations: string[]
  filesChanged: number
  suggestedClasses: string[]
  confirmedClasses: string[]
  leadTookOver: boolean
}

export interface AttemptFile {
  /** File name without `.json`, e.g. `M0-W3-a1` or `M0-W3-a1-lead`. */
  name: string
  data: Attempt
}

/** Exit code recorded for a gate whose script does not exist yet. */
export const UNAVAILABLE_EXIT = 127
export const UNAVAILABLE_PREFIX = 'unavailable:'

export function isUnavailable(gate: Gate): boolean {
  return gate.exitCode === UNAVAILABLE_EXIT && gate.failingLines[0]?.startsWith(UNAVAILABLE_PREFIX) === true
}

/** A gate that ran and failed (unavailable gates are not failures of the WP). */
export function isFailure(gate: Gate): boolean {
  return gate.exitCode !== 0 && !isUnavailable(gate)
}

/** `<WP-ID>-a<k>.json` for workers, `<WP-ID>-a<k>-lead.json` for the lead. */
export function attemptFileName(opts: { wp: string; attempt: number; runner: Attempt['runner'] }): string {
  const suffix = opts.runner === 'lead' ? '-lead' : ''
  return `${opts.wp}-a${String(opts.attempt)}${suffix}.json`
}

/** Loads and validates every attempt file; invalid files are reported, not thrown. */
export function loadAttempts(root: string): { files: AttemptFile[]; errors: string[] } {
  const dir = paths.attempts(root)
  const schema = loadSchema(root, 'attempt')
  const files: AttemptFile[] = []
  const errors: string[] = []
  for (const name of listDir(dir).filter((n) => n.endsWith('.json'))) {
    try {
      const data: unknown = JSON.parse(readText(join(dir, name)))
      const problems = validate(schema, data)
      if (problems.length > 0) throw new Error(problems.join('; '))
      files.push({ name: name.replace(/\.json$/, ''), data: data as Attempt })
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { files, errors }
}

/** One file per (WP, attempt): the lead's file wins over the worker's. */
export function effectiveAttempts(files: AttemptFile[]): AttemptFile[] {
  const byKey = new Map<string, AttemptFile>()
  for (const file of files) {
    const key = `${file.data.wp}#${String(file.data.attempt)}`
    const existing = byKey.get(key)
    if (existing === undefined || file.data.runner === 'lead') byKey.set(key, file)
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Confirmed classes when the lead set any, otherwise the suggested ones (deduplicated). */
export function classesOf(attempt: Attempt): string[] {
  const chosen = attempt.confirmedClasses.length > 0 ? attempt.confirmedClasses : attempt.suggestedClasses
  return [...new Set(chosen)]
}
