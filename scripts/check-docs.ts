import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { isSourceFile, listFiles, readText } from './lib/files'
import { isMain, report } from './lib/report'
import { workspacePackages } from './lib/workspace'

const BASE_HEADINGS = ['## Purpose', '## Public API']
const MODULE_HEADINGS = ['## Ports', '## Invariants']
const TSDOC_PACKAGE = /^packages\/(?:kernel|platform|modules\/[^/]+)$/
const EXPORTED_FUNCTION = /^export (?:default )?(?:async )?function\b/
const EXPORTED_ARROW = /^export const \w+(?::[^=]+)? = (?:async )?(?:function\b|\(|<|\w+ =>)/

/** True when a prettier-formatted `line` starts an exported function declaration or function-valued const. */
export const isExportedFunction = (line: string): boolean => EXPORTED_FUNCTION.test(line) || EXPORTED_ARROW.test(line)

/** Returns findings for a missing README or missing required headings in package `dir`. */
export function readmeFindings(root: string, dir: string): string[] {
  const path = join(root, dir, 'README.md')
  if (!existsSync(path)) return [`${dir}: missing README.md`]
  const lines = new Set(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim()),
  )
  const required = dir.startsWith('packages/modules/') ? [...BASE_HEADINGS, ...MODULE_HEADINGS] : BASE_HEADINGS
  return required.filter((heading) => !lines.has(heading)).map((heading) => `${dir}/README.md: missing "${heading}"`)
}

/** True when the line directly above `index` closes a comment block that opens with the TSDoc marker. */
export function hasTsDoc(lines: readonly string[], index: number): boolean {
  let cursor = index - 1
  if (!(lines[cursor] ?? '').trim().endsWith('*/')) return false
  while (cursor > 0 && !(lines[cursor] ?? '').includes('/*')) cursor -= 1
  return (lines[cursor] ?? '').trimStart().startsWith('/**')
}

/** Returns `file:line` findings for exported functions without TSDoc in the non-test sources of package `dir`. */
export function tsdocFindings(root: string, dir: string): string[] {
  return listFiles(root, `${dir}/src`)
    .filter(isSourceFile)
    .flatMap((file) => {
      const lines = (readText(join(root, file)) ?? '').split('\n')
      const missing = lines.flatMap((line, index) =>
        isExportedFunction(line) && !hasTsDoc(lines, index) ? [index] : [],
      )
      return missing.map((index) => `${file}:${String(index + 1)} exported function lacks TSDoc`)
    })
}

/**
 * Returns every README and TSDoc finding for the workspace packages under `packages/` below `root`.
 * Apps are composition roots rather than documented libraries (spec §5.1, §7.3), so they are not checked.
 */
export function checkDocs(root: string): string[] {
  const packages = workspacePackages(root).filter((dir) => dir.startsWith('packages/'))
  return packages.flatMap((dir) => [
    ...readmeFindings(root, dir),
    ...(TSDOC_PACKAGE.test(dir) ? tsdocFindings(root, dir) : []),
  ])
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { root: { type: 'string', default: process.cwd() } } })
  report('check:docs', checkDocs(values.root))
}
