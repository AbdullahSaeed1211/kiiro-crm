import { parseArgs } from 'node:util'
import { isSourceFile, listFiles } from './lib/files'
import { isMain, report } from './lib/report'
import { formatMatch, scanFiles } from './lib/scan'

/** Vertical vocabulary forbidden in the domain-agnostic core (spec §3, constraint 3), as whole words with an optional plural. */
export const VOCAB_PATTERN = /\b(?:lead|deal|contact|organization|project|task|matter|inspection|patient|booking)s?\b/gi

const CORE_DIRS = ['packages/kernel', 'packages/platform']

/** Splits camelCase, PascalCase and snake_case identifiers into space-separated words so each word matches on its own. */
export function splitWords(line: string): string {
  return line
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replaceAll('_', ' ')
}

/** Lists kernel and platform source files below `root`, excluding tests. */
export function vocabFiles(root: string): string[] {
  const files = CORE_DIRS.flatMap((dir) => listFiles(root, dir))
  return files.filter(isSourceFile)
}

/** Returns `file:line word` findings for the core packages below `root`. */
export function checkVocab(root: string): string[] {
  return scanFiles(root, vocabFiles(root), { pattern: VOCAB_PATTERN, prepare: splitWords }).map(formatMatch)
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { root: { type: 'string', default: process.cwd() } } })
  report('check:vocab', checkVocab(values.root))
}
