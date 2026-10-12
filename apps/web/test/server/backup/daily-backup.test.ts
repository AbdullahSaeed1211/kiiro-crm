import { describe, expect, it, vi } from 'vitest'
import { runDailyBackup } from '../../../src/server/backup/daily-backup'

const NOW = Date.UTC(2026, 9, 13, 12)
const TODAY = 'backups/2026-10-13/'

interface FakeOptions {
  readonly tables: Record<string, Record<string, unknown>[]>
  readonly failOn?: string
}

/** In-memory D1 answering the three query shapes the backup sends: sqlite_master, paged SELECT *. */
function fakeD1({ tables, failOn }: FakeOptions, queries: string[]): D1Database {
  const names = [...Object.keys(tables), '_cf_KV', 'workspace_search_idx']
  const run = (sql: string): unknown[] => {
    queries.push(sql)
    if (sql.includes('sqlite_master')) return names.map((name) => ({ name, sql: `CREATE TABLE "${name}" (id)` }))
    const match = /FROM "([^"]+)" ORDER BY rowid LIMIT (\d+) OFFSET (\d+)/u.exec(sql)
    if (match === null) throw new Error(`unexpected query: ${sql}`)
    const [, table = '', limit = '0', offset = '0'] = match
    if (table === failOn) throw new Error('boom')
    return (tables[table] ?? []).slice(Number(offset), Number(offset) + Number(limit))
  }
  const prepare = (sql: string) => ({ sql, all: () => Promise.resolve({ results: run(sql) }) })
  const batch = (statements: { sql: string }[]) =>
    Promise.resolve(statements.map((statement) => ({ results: run(statement.sql) })))
  return { prepare, batch } as unknown as D1Database
}

interface FakeBucket {
  readonly bucket: R2Bucket
  readonly objects: Map<string, string>
  readonly puts: string[]
}

/** In-memory R2 that records the order of writes and supports prefix listing and batch delete. */
function fakeR2(seed: Record<string, string> = {}): FakeBucket {
  const objects = new Map(Object.entries(seed))
  const puts: string[] = []
  const listed = (prefix: string) => [...objects.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key }))
  const bucket = {
    head: (key: string) => Promise.resolve(objects.has(key) ? { key } : null),
    put: (key: string, body: string) => {
      puts.push(key)
      objects.set(key, body)
      return Promise.resolve()
    },
    list: ({ prefix }: { prefix: string }) => Promise.resolve({ objects: listed(prefix), truncated: false }),
    delete: (keys: string[]) => {
      for (const key of keys) objects.delete(key)
      return Promise.resolve()
    },
  }
  return { bucket: bucket as unknown as R2Bucket, objects, puts }
}

const tables = {
  orders: [
    { id: 1, total: 12.5, note: null },
    { id: 2, total: 3, note: 'rush' },
  ],
  files: [{ id: 1, body: new Uint8Array([1, 2, 3]).buffer }],
}

describe('runDailyBackup', () => {
  it('does nothing on a second call the same day', async () => {
    const r2 = fakeR2()
    const queries: string[] = []
    const env = { D1: fakeD1({ tables }, queries), R2: r2.bucket }
    expect(await runDailyBackup(env, NOW)).toEqual({ status: 'done', tables: 2, rows: 3 })
    const writesAfterFirst = r2.puts.length
    const queriesAfterFirst = queries.length
    expect(await runDailyBackup(env, NOW)).toEqual({ status: 'already-done' })
    expect(r2.puts).toHaveLength(writesAfterFirst)
    expect(queries).toHaveLength(queriesAfterFirst)
  })

  it('writes the manifest last, and skips internal tables', async () => {
    const r2 = fakeR2()
    await runDailyBackup({ D1: fakeD1({ tables }, []), R2: r2.bucket }, NOW)
    expect(r2.puts.at(-1)).toBe(`${TODAY}manifest.json`)
    const manifest = JSON.parse(r2.objects.get(`${TODAY}manifest.json`) ?? '{}') as { tables: Record<string, number> }
    expect(manifest.tables).toEqual({ orders: 2, files: 1 })
    expect(r2.objects.get(`${TODAY}data.ndjson`)).toContain('"body":"AQID"')
  })

  it('reads the first page of every table in one batch, so the call count does not grow with the table count', async () => {
    const r2 = fakeR2()
    const queries: string[] = []
    await runDailyBackup({ D1: fakeD1({ tables }, queries), R2: r2.bucket }, NOW)
    expect(r2.puts).toEqual([`${TODAY}data.ndjson`, `${TODAY}schema.sql`, `${TODAY}manifest.json`])
  })

  it('leaves no manifest when a table fails, so the next tick retries', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const r2 = fakeR2()
    const result = await runDailyBackup({ D1: fakeD1({ tables, failOn: 'files' }, []), R2: r2.bucket }, NOW)
    expect(result).toMatchObject({ status: 'failed' })
    expect(r2.objects.has(`${TODAY}manifest.json`)).toBe(false)
  })
})

describe('backup retention', () => {
  it('deletes backups older than 14 days and keeps newer ones and other keys', async () => {
    const r2 = fakeR2({
      'backups/2026-09-01/data.ndjson': '',
      'backups/2026-09-30/data.ndjson': '',
      'other/keep.txt': '',
    })
    await runDailyBackup({ D1: fakeD1({ tables }, []), R2: r2.bucket }, NOW)
    expect(r2.objects.has('backups/2026-09-01/data.ndjson')).toBe(false)
    expect(r2.objects.has('backups/2026-09-30/data.ndjson')).toBe(true)
    expect(r2.objects.has('other/keep.txt')).toBe(true)
  })
})
