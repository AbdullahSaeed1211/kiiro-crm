import { DEFAULT_OUT_DIR } from './output'

/** A command-line mistake; its message is printed without a stack trace. */
export class UsageError extends Error {}

/** Options shared by every spike script, spread into the `parseArgs` options. */
export const COMMON_OPTIONS = {
  env: { type: 'string' },
  'out-dir': { type: 'string' },
  'dry-run': { type: 'boolean', default: false },
} as const

/** Shared options: environment name for the output file name, output directory, dry-run flag. */
export interface CommonOptions {
  readonly env: string
  readonly outDir: string
  readonly dryRun: boolean
}

const ENV_NAME = /^[a-z0-9][a-z0-9-]*$/

/** Validates the shared options. */
export function commonOptions(values: {
  readonly env?: string | undefined
  readonly 'out-dir'?: string | undefined
  readonly 'dry-run'?: boolean | undefined
}): CommonOptions {
  const env = values.env ?? ''
  if (!ENV_NAME.test(env)) throw new UsageError('--env <name> is required: lowercase letters, digits and dashes')
  return { env, outDir: values['out-dir'] ?? DEFAULT_OUT_DIR, dryRun: values['dry-run'] === true }
}

/** Returns `raw`, or throws when the required flag is missing or empty. */
export function requireFlag(raw: string | undefined, flag: string): string {
  if (raw === undefined || raw === '') throw new UsageError(`${flag} is required`)
  return raw
}

/** Parses a decimal integer flag of at least `bounds.min`; `bounds.fallback` when absent. */
export function intFlag(
  flag: string,
  raw: string | undefined,
  bounds: { readonly fallback: number; readonly min: number },
): number {
  if (raw === undefined) return bounds.fallback
  const value = Number(raw)
  if (!/^\d+$/.test(raw) || value < bounds.min) {
    throw new UsageError(`${flag} must be an integer >= ${String(bounds.min)}, got "${raw}"`)
  }
  return value
}

/** Returns `raw` when it is an absolute http or https URL. */
export function httpUrl(raw: string, flag: string): string {
  const protocol = URL.canParse(raw) ? new URL(raw).protocol : ''
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new UsageError(`${flag} must be an http or https URL, got "${raw}"`)
  }
  return raw
}

/** Parses an ISO 8601 instant. */
export function instantFlag(raw: string, flag: string): Date {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) throw new UsageError(`${flag} must be an ISO 8601 instant, got "${raw}"`)
  return date
}

/** Runs an entry point, printing a thrown or rejected error as one line and setting exit code 1. */
export function runCli(main: () => Promise<unknown>): void {
  Promise.resolve()
    .then(main)
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
