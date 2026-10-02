import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { loadGroups } from './lib/load-order'
import { isMain, runCli } from './lib/report'

const USAGE =
  'usage: pnpm tenant:restore <slug> <backup-folder> [--database <name>]  (loads a pnpm tenant:backup folder into an EMPTY migrated database)'
/** Tables the migrations already filled, or that are not exported. */
const NEVER_LOADED = new Set(['payload_migrations'])
const WEB_DIR = join(process.cwd(), 'apps', 'web')

const wrangler = (args: readonly string[]): string =>
  execFileSync(process.execPath, [join(WEB_DIR, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), ...args], {
    cwd: WEB_DIR,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
    env: { ...process.env, CI: '1' },
  })

/** The tables each table points at with a foreign key, read from the saved CREATE statements. */
function dependencies(schema: string): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>()
  for (const match of schema.matchAll(/CREATE TABLE `(\w+)` \(([\s\S]*?)\);\s*(?=CREATE TABLE|$)/gu)) {
    const refs = [...(match[2] ?? '').matchAll(/REFERENCES [`"]?(\w+)/gu)].map((ref) => ref[1] ?? '')
    found.set(match[1] ?? '', new Set(refs))
  }
  for (const refs of found.values()) for (const ref of [...refs]) if (!found.has(ref)) refs.delete(ref)
  return found
}

function usersInTarget(database: string): number {
  const out = wrangler([
    'd1',
    'execute',
    database,
    '--remote',
    '--json',
    '--command',
    'SELECT count(*) AS n FROM users',
  ])
  const parsed = JSON.parse(out.slice(out.indexOf('['))) as { results: { n: number }[] }[]
  return parsed[0]?.results[0]?.n ?? -1
}

/** D1 checks foreign keys at the end of each request, so tables that point at each other go in one request (--command); the rest load as files. */
function loadGroup(database: string, folder: string, group: readonly string[]): void {
  const tables = group.filter((table) => !NEVER_LOADED.has(table))
  if (tables.length === 0) return
  const base = ['d1', 'execute', database, '--remote']
  if (tables.length === 1) {
    wrangler([...base, '--file', join(folder, `${tables[0] ?? ''}.sql`)])
    return
  }
  const sql = tables.map((table) => readFileSync(join(folder, `${table}.sql`), 'utf8')).join('\n')
  wrangler([...base, '--command', `PRAGMA defer_foreign_keys = on;\n${sql}`])
}

/** Loads every group in order and returns how many steps ran. */
function restore(database: string, folder: string): number {
  const groups = loadGroups(dependencies(readFileSync(join(folder, 'schema.sql'), 'utf8')))
  for (const group of groups) {
    console.log(`loading ${group.join(' + ')}`)
    loadGroup(database, folder, group)
  }
  return groups.length
}

export function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { database: { type: 'string' } },
  })
  const [slug, folder] = positionals
  if (slug === undefined || folder === undefined || !existsSync(join(folder, 'schema.sql'))) {
    console.error(USAGE)
    return Promise.resolve(2)
  }
  const database = values.database ?? `ops-${slug}`
  const existing = usersInTarget(database)
  if (existing !== 0) {
    console.error(
      `${database} is not empty (${String(existing)} users). Restore only into a freshly migrated, empty database.`,
    )
    return Promise.resolve(2)
  }
  console.log(`restore: ok (${String(restore(database, folder))} steps into ${database})`)
  return Promise.resolve(0)
}

if (isMain(import.meta.url)) runCli(main)
