import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { isMain, runCli } from './lib/report'

const USAGE = 'usage: pnpm tenant:backup <slug> [--verify]  (set -a; . ~/.ops-secrets/<slug>.env; set +a first)'
/** Cloudflare's own export refuses a database with a search (fts5) table, so tables are exported one by one and the search index is skipped. */
const SKIPPED = /^(_cf_KV|workspace_search)/u

interface Target {
  readonly slug: string
  readonly database: string
}

const WEB_DIR = join(process.cwd(), 'apps', 'web')
const SQLITE = '/usr/bin/sqlite3'
const COUNT_BATCH = 5

const wrangler = (args: readonly string[]): string =>
  execFileSync(process.execPath, [join(WEB_DIR, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), ...args], {
    cwd: WEB_DIR,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  })

function query(target: Target, sql: string): Record<string, unknown>[] {
  const out = wrangler(['d1', 'execute', target.database, '--remote', '--env', target.slug, '--json', '--command', sql])
  const parsed = JSON.parse(out.slice(out.indexOf('['))) as { results: Record<string, unknown>[] }[]
  return parsed[0]?.results ?? []
}

function tablesOf(target: Target): string[] {
  const rows = query(target, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  return rows.map((row) => String(row['name'])).filter((name) => !SKIPPED.test(name))
}

/** The CREATE statements of the exported tables, kept beside the data so a scratch copy can be built from the backup alone. */
function schemaOf(target: Target, tables: readonly string[]): string {
  const list = tables.map((name) => `'${name}'`).join(',')
  const rows = query(target, `SELECT sql FROM sqlite_master WHERE type='table' AND name IN (${list}) ORDER BY name`)
  return rows.map((row) => `${String(row['sql'])};`).join('\n')
}

/** Row counts of every exported table, read in small batches (D1 allows at most 5 terms in a union). */
function countsOf(target: Target, tables: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (let start = 0; start < tables.length; start += COUNT_BATCH) {
    const batch = tables.slice(start, start + COUNT_BATCH)
    const sql = batch.map((name) => `SELECT '${name}' AS t, count(*) AS c FROM \`${name}\``).join(' UNION ALL ')
    for (const row of query(target, sql)) counts[String(row['t'])] = Number(row['c'])
  }
  return counts
}

/** Loads every exported file into a throwaway SQLite file and returns its row counts. */
function restoredCounts(folder: string, tables: readonly string[]): Record<string, number> {
  const scratch = join(folder, 'restore-check.db')
  rmSync(scratch, { force: true })
  execFileSync(SQLITE, [scratch], { input: `.read ${join(folder, 'schema.sql')}\n`, encoding: 'utf8' })
  for (const name of tables) {
    const file = join(folder, `${name}.sql`)
    const script = `PRAGMA foreign_keys=OFF;\n.read ${file}\n`
    execFileSync(SQLITE, [scratch], { input: script, encoding: 'utf8', maxBuffer: 1 << 28 })
  }
  const union = tables.map((name) => `SELECT '${name}', count(*) FROM \`${name}\``).join(' UNION ALL ')
  const out = execFileSync(SQLITE, [scratch, union], { encoding: 'utf8' })
  rmSync(scratch, { force: true })
  return Object.fromEntries(
    out
      .trim()
      .split('\n')
      .map((line) => [line.split('|')[0] ?? '', Number(line.split('|')[1])]),
  )
}

function backup(target: Target, verify: boolean): string[] {
  const folder = join(homedir(), 'backups', target.slug, new Date().toISOString().slice(0, 10))
  mkdirSync(folder, { recursive: true, mode: 0o700 })
  const tables = tablesOf(target)
  for (const name of tables) {
    const file = join(folder, `${name}.sql`)
    wrangler([
      'd1',
      'export',
      target.database,
      '--remote',
      '--env',
      target.slug,
      '--table',
      name,
      '--no-schema',
      '--output',
      file,
    ])
    chmodSync(file, 0o600)
  }
  writeFileSync(join(folder, 'schema.sql'), schemaOf(target, tables), { mode: 0o600 })
  const counts = countsOf(target, tables)
  writeFileSync(join(folder, 'manifest.json'), JSON.stringify({ takenAt: new Date().toISOString(), counts }, null, 2))
  console.log(`${String(tables.length)} tables saved to ${folder}`)
  if (!verify) return []
  const restored = restoredCounts(folder, tables)
  return tables
    .filter((name) => counts[name] !== restored[name])
    .map((name) => `${name}: ${String(counts[name])} rows live, ${String(restored[name])} restored`)
}

export function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { verify: { type: 'boolean' } },
  })
  const slug = positionals[0]
  if (slug === undefined || !existsSync(join('tenants', `${slug}.jsonc`))) {
    console.error(USAGE)
    return Promise.resolve(2)
  }
  const problems = backup({ slug, database: `ops-${slug}` }, values.verify === true)
  for (const problem of problems) console.error(problem)
  console.log(problems.length === 0 ? 'backup: ok' : `backup: ${String(problems.length)} table(s) differ`)
  return Promise.resolve(problems.length === 0 ? 0 : 1)
}

if (isMain(import.meta.url)) runCli(main)
