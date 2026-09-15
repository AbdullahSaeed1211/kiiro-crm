import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { CODE_FILE, listFiles, readText } from './lib/files'
import { isMain, report } from './lib/report'

const SCANNED_DIRS = ['apps', 'packages', 'scripts']
const FIXTURES_DIR = 'scripts/fixtures/'
const RULES_URL = new URL('../tooling/eslint/rules.js', import.meta.url)
const DIRECTIVE =
  /\/\*\s*eslint-disable(?:-next-line|-line)?\b([\s\S]*?)\*\/|\/\/\s*eslint-disable(?:-next-line|-line)?\b(.*)/g

/** A directive that disables a gated rule. */
export interface GatedDisable {
  readonly line: number
  readonly rule: string
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

/** Loads the gated rule names (`gatedRules` and `tsxOverrides` keys) from `tooling/eslint/rules.js`. */
export async function loadGatedRules(url: URL = RULES_URL): Promise<Set<string>> {
  const rules = asRecord(await import(url.href))
  return new Set([...Object.keys(asRecord(rules['gatedRules'])), ...Object.keys(asRecord(rules['tsxOverrides']))])
}

/** Extracts rule names from the text after a directive keyword, dropping any `-- description`. */
export function ruleNames(body: string): string[] {
  const rules = body.split(/\s-{2,}\s/)[0] ?? ''
  return rules
    .split(',')
    .map((rule) => rule.trim())
    .filter((rule) => rule !== '')
}

/** Returns whether a directive documents its intentional exception after `--`. */
function hasReason(body: string): boolean {
  return /\s-{2,}\s+\S/.test(body)
}

/** Finds unreasoned eslint-disable directives in `text` that name a rule from `gated`. */
export function gatedDisables(text: string, gated: ReadonlySet<string>): GatedDisable[] {
  return [...text.matchAll(DIRECTIVE)].flatMap((match) => {
    const body = match[1] ?? match[2] ?? ''
    const line = text.slice(0, match.index).split('\n').length
    const rules = hasReason(body) ? [] : ruleNames(body).filter((rule) => gated.has(rule))
    return rules.map((rule) => ({ line, rule }))
  })
}

/** Lists code files below `root` that may carry directives: top-level files plus apps, packages and scripts, minus planted fixtures. */
export function disableFiles(root: string): string[] {
  const topLevel = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isFile())
  const nested = SCANNED_DIRS.flatMap((dir) => listFiles(root, dir)).filter((file) => !file.startsWith(FIXTURES_DIR))
  return [...topLevel.map((entry) => entry.name), ...nested].filter((file) => CODE_FILE.test(file))
}

/** Returns `file:line rule` findings for directives below `root` that disable a rule in `gated`. */
export function checkDisables(root: string, gated: ReadonlySet<string>): string[] {
  return disableFiles(root).flatMap((file) =>
    gatedDisables(readText(join(root, file)) ?? '', gated).map(({ line, rule }) => `${file}:${String(line)} ${rule}`),
  )
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { root: { type: 'string', default: process.cwd() } } })
  report('check:disables', checkDisables(values.root, await loadGatedRules()))
}
