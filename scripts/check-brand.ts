import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { listFiles } from './lib/files'
import { isMain, report } from './lib/report'
import { escapeRegExp, formatMatch, scanFiles } from './lib/scan'

/** Brand tokens forbidden in product code (spec §3, constraint 2), matched case-insensitively as substrings. */
export const BRAND_TOKENS: readonly string[] = ['mirch', 'frappe', 'twenty', 'plane', 'huly']

const SCANNED_DIRS = ['apps', 'packages']
// Generated from tenants/*.jsonc, where tenant names and hostnames are allowed.
const EXCLUDED_FILES: ReadonlySet<string> = new Set([
  'apps/mail-router/wrangler.jsonc',
  'apps/web/cloudflare-env.d.ts',
  // Local runtime configuration contains tenant identity and operator addresses, not product source.
  'apps/web/.dev.vars',
  'apps/web/.dev.vars.example',
  'apps/web/wrangler.jsonc',
  // Local stack fixture intentionally uses the seeded owner identity to exercise reset/auth flows.
  'packages/adapters/payload/test/spike/local-stack.ts',
])
const DISPLAY_NAME = /"displayName"\s*:\s*"([^"]+)"/g

/** Reads every `displayName` from `tenants/*.jsonc` below `root`; no tenants directory yields no names. */
export function tenantNames(root: string): string[] {
  const dir = join(root, 'tenants')
  if (!existsSync(dir)) return []
  const configs = readdirSync(dir).filter((file) => file.endsWith('.jsonc'))
  const names = configs.flatMap((file) => [...readFileSync(join(dir, file), 'utf8').matchAll(DISPLAY_NAME)])
  return names.map((match) => (match[1] ?? '').trim()).filter((name) => name !== '')
}

/** Builds the global, case-insensitive pattern for the brand tokens plus the tenant `names`. */
export function brandPattern(names: readonly string[]): RegExp {
  return new RegExp([...BRAND_TOKENS, ...names].map(escapeRegExp).join('|'), 'gi')
}

/** Lists the repository files covered by the scan: `apps/**` and `packages/**` minus generated and build directories. */
export function brandFiles(root: string): string[] {
  return SCANNED_DIRS.flatMap((dir) => listFiles(root, dir)).filter((file) => !EXCLUDED_FILES.has(file))
}

/**
 * Returns `file:line token` findings for the repository at `root`.
 * @param output - build output directory to scan in full instead of `apps/**` and `packages/**`
 */
export function checkBrand(root: string, output?: string): string[] {
  const pattern = brandPattern(tenantNames(root))
  if (output === undefined) return scanFiles(root, brandFiles(root), { pattern }).map(formatMatch)
  const matches = scanFiles(output, listFiles(output, '', new Set()), { pattern })
  return matches.map((match) => formatMatch({ ...match, file: join(output, match.file) }))
}

if (isMain(import.meta.url)) {
  const options = { root: { type: 'string', default: process.cwd() }, path: { type: 'string' } } as const
  const { values } = parseArgs({ options })
  report('check:brand', checkBrand(values.root, values.path))
}
