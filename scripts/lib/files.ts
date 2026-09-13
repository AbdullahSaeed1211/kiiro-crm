import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Directory names that repository scans never descend into. */
export const SKIPPED_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  '.next',
  '.open-next',
  '.wrangler',
  '.git',
  'coverage',
])

/** Source-code files: `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs`. */
export const CODE_FILE = /\.[cm]?[jt]sx?$/

const TEST_DIR = /(?:^|\/)(?:tests?|__tests__)\//
const TEST_NAME = /\.(?:test|spec)\.[cm]?[jt]sx?$/
const NUL = String.fromCharCode(0)

/** True for non-test source code: a code extension, outside `test/`, `tests/` and `__tests__/`, not named `*.test.*` or `*.spec.*`. */
export function isSourceFile(path: string): boolean {
  return CODE_FILE.test(path) && !TEST_DIR.test(path) && !TEST_NAME.test(path)
}

/**
 * Lists every file below `dir` as a sorted POSIX path relative to `root`; a missing `dir` yields no files.
 * @param skip - directory names pruned from the walk (default {@link SKIPPED_DIRS})
 */
export function listFiles(root: string, dir: string, skip: ReadonlySet<string> = SKIPPED_DIRS): string[] {
  const absolute = join(root, dir)
  if (!existsSync(absolute)) return []
  const entries = readdirSync(absolute, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  return entries.flatMap((entry) => {
    const path = dir === '' ? entry.name : `${dir}/${entry.name}`
    if (entry.isDirectory()) return skip.has(entry.name) ? [] : listFiles(root, path, skip)
    return entry.isFile() ? [path] : []
  })
}

/** Reads a UTF-8 text file; returns null when the content is binary (contains a NUL byte). */
export function readText(path: string): string | null {
  const text = readFileSync(path, 'utf8')
  return text.includes(NUL) ? null : text
}
