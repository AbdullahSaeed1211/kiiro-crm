import { join } from 'node:path'
import { readText } from './files'

/** One pattern match inside a scanned file. */
export interface Match {
  readonly file: string
  readonly line: number
  readonly token: string
}

/** Options for {@link scanFiles}. */
export interface ScanOptions {
  /** Global (`g`) pattern; every match on a line is reported. */
  readonly pattern: RegExp
  /** Rewrites each line before matching, for example to split identifiers into words. */
  readonly prepare?: (line: string) => string
}

/** Finds every match of `options.pattern` on each line of `files` (paths relative to `root`); binary files are skipped. */
export function scanFiles(root: string, files: readonly string[], options: ScanOptions): Match[] {
  const prepare = options.prepare ?? ((line: string) => line)
  return files.flatMap((file) => {
    const lines = (readText(join(root, file)) ?? '').split('\n')
    return lines.flatMap((line, index) =>
      [...prepare(line).matchAll(options.pattern)].map((match) => ({ file, line: index + 1, token: match[0] })),
    )
  })
}

/** Formats a match as `file:line token`. */
export const formatMatch = (match: Match): string => `${match.file}:${String(match.line)} ${match.token}`

/** Escapes `text` for literal use inside a regular expression. */
export const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
