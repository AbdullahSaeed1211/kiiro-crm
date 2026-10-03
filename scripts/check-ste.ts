import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMain } from './lib/report'

/**
 * A rough ASD-STE100 check for the English text of the copy files written in the parity pass: sentences of at most 20
 * words, and none of the words the standard avoids for possibility or passive voice. It is a guard, not a full parser.
 */
const FILES = [
  'dashboard-today-copy',
  'export-copy',
  'filter-chips-copy',
  'import-mapping-copy',
  'not-found-copy',
  'deal-board-copy',
]
const MAX_WORDS = 20
const AVOID = /\b(may|might|could be|has been|have been|had been|is being|was|were|been)\b/iu

function englishStrings(source: string): string[] {
  const block = /^ {2}en: \{([\s\S]*?)^ {2}\},/mu.exec(source)?.[1] ?? ''
  return [...block.matchAll(/'((?:[^'\\]|\\.)*)'/gu)].map((match) => match[1] ?? '')
}

function problemsIn(name: string, text: string): string[] {
  const long = text
    .split(/(?<=[.?!])\s+/u)
    .map((sentence) => ({ sentence, words: sentence.split(/\s+/u).filter(Boolean).length }))
    .filter(({ words }) => words > MAX_WORDS)
    .map(({ sentence, words }) => `${name}: ${String(words)} words: ${sentence}`)
  return AVOID.test(text) ? [...long, `${name}: avoid passive or possibility wording: ${text}`] : long
}

function steFindings(root: string): string[] {
  return FILES.flatMap((name) =>
    englishStrings(readFileSync(join(root, 'apps/web/src/i18n', `${name}.ts`), 'utf8')).flatMap((text) =>
      problemsIn(name, text),
    ),
  )
}

if (isMain(import.meta.url)) {
  const findings = steFindings(process.cwd())
  for (const finding of findings) console.error(finding)
  console.log(findings.length === 0 ? 'check:ste: ok' : `check:ste: ${String(findings.length)} problems`)
  process.exitCode = findings.length === 0 ? 0 : 1
}
