import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { isMain, report } from './lib/report'
import { isSourceFile, listFiles, readText } from './lib/files'

const NON_DISPLAY_FORMATTERS: ReadonlySet<string> = new Set([
  'apps/web/src/app/(app)/calendar/page.tsx', // ISO date keys and month arithmetic require stable calendar output.
  'apps/web/src/app/api/v1/internal/provision/helpers.ts', // Provisioning diagnostics are protocol timestamps, not tenant UI.
])

/** Finds customer-app formatters that hardcode a locale instead of using the tenant formatter helpers. */
export function formatterFindings(root: string): string[] {
  return listFiles(root, 'apps/web/src')
    .filter(isSourceFile)
    .filter((file) => !NON_DISPLAY_FORMATTERS.has(file))
    .flatMap((file) => {
      const text = readText(join(root, file))
      if (text === null) return []
      return text
        .split('\n')
        .flatMap((line, index) =>
          /new Intl\.(?:DateTimeFormat|NumberFormat)\(['"]/.test(line)
            ? [`${file}:${String(index + 1)} hardcoded Intl locale`]
            : [],
        )
    })
}

if (isMain(import.meta.url)) {
  const { values } = parseArgs({ options: { root: { type: 'string', default: process.cwd() } } })
  report('check:formatters', formatterFindings(values.root))
}
