import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { SUPPORTED_LOCALES } from '../apps/web/src/i18n/locale'
import {
  INBOX_COPY,
  LOCALE_LABELS,
  NOTIFICATION_COPY,
  SEARCH_COPY,
  SETTINGS_COPY,
  SETTINGS_ITEM_COPY,
  SHELL_COPY,
  DASHBOARD_COPY,
} from '../apps/web/src/i18n/config'
import { REPORT_COPY, TASK_COPY } from '../apps/web/src/i18n/work-copy'
import { isMain, report } from './lib/report'
import { isSourceFile, listFiles, readText } from './lib/files'

type Catalog = Readonly<Record<string, string>>

const LOCALE_CATALOGS: Readonly<Record<string, Readonly<Record<string, Catalog>>>> = {
  SHELL_COPY,
  SETTINGS_COPY,
  SETTINGS_ITEM_COPY,
  SEARCH_COPY,
  NOTIFICATION_COPY,
  INBOX_COPY,
  DASHBOARD_COPY,
  TASK_COPY,
  REPORT_COPY,
}

/** Finds missing or extra keys between every shipped locale catalog. */
export function catalogFindings(): string[] {
  const labels = SUPPORTED_LOCALES.filter((locale) => typeof LOCALE_LABELS[locale] !== 'string').map(
    (locale) => `LOCALE_LABELS missing ${locale}`,
  )
  return [
    ...labels,
    ...Object.entries(LOCALE_CATALOGS).flatMap(([name, catalog]) => {
      const baseline = new Set(Object.keys(catalog.en ?? {}))
      return SUPPORTED_LOCALES.flatMap((locale) => {
        if (locale === 'en') return []
        const keys = new Set(Object.keys(catalog[locale] ?? {}))
        return [
          ...[...baseline].filter((key) => !keys.has(key)).map((key) => `${name}.${locale} missing ${key}`),
          ...[...keys].filter((key) => !baseline.has(key)).map((key) => `${name}.${locale} extra ${key}`),
        ]
      })
    }),
  ]
}

/** Returns user-facing JSX text literals so new copy can be moved into a locale catalog deliberately. */
export function literalInventory(root: string): string[] {
  const files = listFiles(root, 'apps/web/src/app')
    .filter(isSourceFile)
    .filter((file) => file.endsWith('.tsx'))
  const findings: string[] = []
  const literal = />\s*([A-Za-z][^<{\n]{1,100}?)\s*</g
  for (const file of files) {
    const text = readText(join(root, file))
    if (text === null) continue
    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(literal)) {
        const value = (match[1] ?? '').trim()
        if (value !== '' && !value.startsWith('http')) findings.push(`${file}:${String(index + 1)} ${value}`)
      }
    })
  }
  return findings
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { root: { type: 'string', default: process.cwd() } } })
  const findings = catalogFindings()
  const inventory = literalInventory(values.root)
  console.log(`check:i18n: ${String(inventory.length)} user-facing literal(s) inventoried`)
  report('check:i18n', findings)
}
