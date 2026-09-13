import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** Default output directory, relative to the repository root the scripts run from. */
export const DEFAULT_OUT_DIR = 'docs/spike-data'

/** Replacement text for secrets in printed output. */
export const REDACTED = '[redacted]'

/** ISO 8601 UTC instant to the second, e.g. `2026-09-13T14:22:33Z`. */
export function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** ISO 8601 basic-format UTC timestamp to the second, e.g. `20260913T142233Z`, safe in file names. */
export function fileTimestamp(date: Date): string {
  return isoSeconds(date).replace(/[-:]/g, '')
}

/** `<outDir>/<metric>-<env>-<timestamp>.json`. */
export function outputPath(
  metric: string,
  options: { readonly outDir: string; readonly env: string },
  date: Date,
): string {
  return join(options.outDir, `${metric}-${options.env}-${fileTimestamp(date)}.json`)
}

/** Writes `data` as two-space-indented JSON with a trailing newline, creating the directory. */
export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

/** Replaces every occurrence of each non-empty secret with {@link REDACTED}. */
export function redact(text: string, secrets: readonly string[]): string {
  return secrets.filter((secret) => secret !== '').reduce((out, secret) => out.replaceAll(secret, REDACTED), text)
}

/** Prints one planned command, request or write in dry-run mode. */
export function printPlanned(line: string): void {
  console.log(`[dry-run] ${line}`)
}

/** Rounds milliseconds to three decimals. */
export function roundMs(ms: number): number {
  return Math.round(ms * 1000) / 1000
}
