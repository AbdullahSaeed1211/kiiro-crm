/**
 * Copies the tenant's D1 database into its own R2 bucket once a day (see docs/guides/owner-guide.md, Automatic backups).
 * One data.ndjson holds every row as `{ table, row }`; schema.sql and manifest.json sit beside it. The whole database
 * is held in memory for the run, which suits a workspace of this size; a much larger one needs streaming.
 */

const PAGE_ROWS = 500
const KEEP_DAYS = 14
const DAY_MS = 86_400_000
const BACKUP_ROOT = 'backups/'
const DELETE_BATCH = 500
/** Internal tables (D1 metadata, sqlite bookkeeping) and the fts5 search index, which is rebuilt from the records. */
const SKIPPED_TABLE = /^(_cf_|sqlite_|workspace_search)/u
const DATE_KEY = /^backups\/(\d{4}-\d{2}-\d{2})\//u

export interface BackupEnv {
  readonly D1: D1Database
  readonly R2: R2Bucket
}

export type BackupResult =
  | { readonly status: 'already-done' }
  | { readonly status: 'done'; readonly tables: number; readonly rows: number }
  | { readonly status: 'failed'; readonly error: string }

interface TableRow {
  readonly name: string
  readonly sql: string | null
}

const quote = (name: string): string => `"${name.replaceAll('"', '""')}"`

const shortMessage = (error: unknown): string =>
  (error instanceof Error ? error.message : 'unknown error').slice(0, 200)

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** BLOBs become base64 strings; every other D1 value (number, string, null) is kept as it is. */
function encodeValue(value: unknown): unknown {
  if (value instanceof ArrayBuffer) return toBase64(new Uint8Array(value))
  if (ArrayBuffer.isView(value)) return toBase64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
  return value
}

const encodeRow = (row: Record<string, unknown>): string =>
  JSON.stringify(Object.fromEntries(Object.entries(row).map(([key, value]) => [key, encodeValue(value)])))

async function listTables(db: D1Database): Promise<TableRow[]> {
  const { results } = await db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all<TableRow>()
  return results.filter((table) => !SKIPPED_TABLE.test(table.name))
}

const pageSql = (table: string, offset: number): string =>
  `SELECT * FROM ${quote(table)} ORDER BY rowid LIMIT ${String(PAGE_ROWS)} OFFSET ${String(offset)}`

const lineFor = (table: string, row: Record<string, unknown>): string =>
  `${JSON.stringify({ table, row: JSON.parse(encodeRow(row)) as unknown })}\n`

/** Reads the rest of a table that filled its first page, one page per query. */
async function remainingPages(db: D1Database, table: string): Promise<string[]> {
  const lines: string[] = []
  for (let offset = PAGE_ROWS; ; offset += PAGE_ROWS) {
    const { results } = await db.prepare(pageSql(table, offset)).all()
    for (const row of results) lines.push(lineFor(table, row))
    if (results.length < PAGE_ROWS) return lines
  }
}

/**
 * Reads every table into NDJSON lines of `{ table, row }`. The first page of all tables goes in one batch, so a
 * small database costs a handful of subrequests however many tables it has; only a full page asks for more.
 */
async function exportAll(
  db: D1Database,
  tables: readonly string[],
): Promise<{ lines: string[]; counts: Record<string, number> }> {
  const first = await db.batch(tables.map((table) => db.prepare(pageSql(table, 0))))
  const lines: string[] = []
  const counts: Record<string, number> = {}
  for (const [index, table] of tables.entries()) {
    const rows = first[index]?.results ?? []
    const own = rows.map((row) => lineFor(table, row as Record<string, unknown>))
    if (rows.length === PAGE_ROWS) {
      try {
        own.push(...(await remainingPages(db, table)))
      } catch (error) {
        throw new Error(`table ${table}: ${shortMessage(error)}`)
      }
    }
    counts[table] = own.length
    lines.push(...own)
  }
  return { lines, counts }
}

const isExpired = (key: string, cutoff: number): boolean => {
  const day = DATE_KEY.exec(key)?.[1]
  return day !== undefined && Date.parse(`${day}T00:00:00Z`) < cutoff
}

/** Deletes backup objects whose day folder started before the cutoff, one listing page at a time. */
async function pruneBackups(bucket: R2Bucket, cutoff: number): Promise<number> {
  let cursor: string | undefined
  let deleted = 0
  do {
    const page = await bucket.list({ prefix: BACKUP_ROOT, cursor })
    const expired = page.objects.map((object) => object.key).filter((key) => isExpired(key, cutoff))
    for (let start = 0; start < expired.length; start += DELETE_BATCH) {
      await bucket.delete(expired.slice(start, start + DELETE_BATCH))
    }
    deleted += expired.length
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor !== undefined)
  return deleted
}

/** Retention is best effort: a failure here is logged and never fails the backup itself. */
async function prune(bucket: R2Bucket, now: number): Promise<void> {
  try {
    await pruneBackups(bucket, now - KEEP_DAYS * DAY_MS)
  } catch (error) {
    console.error('[backup.prune]', shortMessage(error))
  }
}

/**
 * Exports every table to backups/<UTC date>/, then schema.sql, then manifest.json last. A run that
 * stopped before the manifest is retried by the next cron tick. Never throws.
 */
export async function runDailyBackup(env: BackupEnv, now: number): Promise<BackupResult> {
  const prefix = `${BACKUP_ROOT}${new Date(now).toISOString().slice(0, 10)}/`
  try {
    if ((await env.R2.head(`${prefix}manifest.json`)) !== null) return { status: 'already-done' }
    const tables = await listTables(env.D1)
    const { lines, counts } = await exportAll(
      env.D1,
      tables.map((table) => table.name),
    )
    await env.R2.put(`${prefix}data.ndjson`, lines.join(''))
    const schema = tables.flatMap((table) => (table.sql === null ? [] : [`${table.sql};`])).join('\n')
    await env.R2.put(`${prefix}schema.sql`, schema)
    const manifest = { createdAt: new Date(now).toISOString(), tables: counts }
    await env.R2.put(`${prefix}manifest.json`, JSON.stringify(manifest, null, 2))
    await prune(env.R2, now)
    const rows = Object.values(counts).reduce((sum, count) => sum + count, 0)
    return { status: 'done', tables: tables.length, rows }
  } catch (error) {
    console.error('[backup.daily]', shortMessage(error))
    return { status: 'failed', error: shortMessage(error) }
  }
}
