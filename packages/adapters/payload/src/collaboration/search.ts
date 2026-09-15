import type { CollectionSlug, Payload } from 'payload'

export interface SearchDefinition {
  readonly recordType: string
  readonly collection: CollectionSlug
  readonly searchFields: readonly string[]
  readonly titleField: string
  readonly subtitleFields?: readonly string[]
}

export interface SearchResult {
  readonly recordType: string
  readonly id: string
  readonly title: string
  readonly subtitle: string
}

export const SEARCH_DEFINITIONS: readonly SearchDefinition[] = [
  {
    recordType: 'organization',
    collection: 'organizations',
    searchFields: ['name', 'website', 'phone', 'email'],
    titleField: 'name',
  },
  {
    recordType: 'contact',
    collection: 'contacts',
    searchFields: ['firstName', 'lastName', 'email', 'phone'],
    titleField: 'firstName',
    subtitleFields: ['lastName', 'email'],
  },
  {
    recordType: 'lead',
    collection: 'leads',
    searchFields: ['title', 'firstName', 'lastName', 'email', 'phone', 'companyName', 'lostNote'],
    titleField: 'title',
    subtitleFields: ['email', 'companyName'],
  },
  { recordType: 'deal', collection: 'deals', searchFields: ['title', 'lostNote'], titleField: 'title' },
  { recordType: 'project', collection: 'projects', searchFields: ['name', 'description'], titleField: 'name' },
  { recordType: 'task', collection: 'tasks', searchFields: ['title', 'description'], titleField: 'title' },
]

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function field(doc: object, key: string): unknown {
  return Reflect.get(doc, key)
}

function resultOf(definition: SearchDefinition, doc: object): SearchResult {
  const title =
    text(field(doc, definition.titleField)) || text(field(doc, 'title')) || text(field(doc, 'name')) || 'Untitled'
  const subtitle = (definition.subtitleFields ?? [])
    .map((name) => text(field(doc, name)))
    .filter(Boolean)
    .join(' · ')
  return { recordType: definition.recordType, id: String(field(doc, 'id')), title, subtitle }
}

export interface SearchInput {
  readonly user: Record<string, unknown>
  readonly query: string
  readonly definitions?: readonly SearchDefinition[]
}

const MAX_INDEX_CANDIDATES = 100

interface RawSearchDatabase {
  readonly execute?: (args: { raw: string }) => Promise<unknown>
}

interface RawSearchResult {
  readonly rows?: readonly unknown[]
  readonly results?: readonly unknown[]
}

function hasExecute(value: object): value is RawSearchDatabase {
  return 'execute' in value && typeof value.execute === 'function'
}

interface IndexedCandidate {
  readonly recordType: string
  readonly id: string
}

function sqlString(value: string): string {
  return value.replaceAll("'", "''")
}

/** Turns user text into safe FTS5 prefix terms, keeping accents for the unicode61 tokenizer to normalize. */
function ftsQuery(value: string): string {
  const terms = value
    .normalize('NFC')
    .split(/\s+/u)
    .map((term) => term.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter(Boolean)
    .map((term) => `"${term.replaceAll('"', '""')}"*`)
  return terms.join(' AND ')
}

function rowCandidate(value: unknown): IndexedCandidate | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  const recordType = typeof row['record_type'] === 'string' ? row['record_type'] : ''
  const id = typeof row['record_id'] === 'string' ? row['record_id'] : ''
  return recordType && id ? { recordType, id } : null
}

function databaseOf(payload: Payload): RawSearchDatabase | null {
  const database = (payload as unknown as { db?: unknown }).db
  return typeof database === 'object' && database !== null && hasExecute(database) ? database : null
}

/** Queries the SQLite FTS5 index, then rehydrates every hit through Payload to preserve collection access rules. */
async function indexedSearch(
  payload: Payload,
  input: SearchInput,
  definitions: readonly SearchDefinition[],
): Promise<readonly SearchResult[] | null> {
  const database = databaseOf(payload)
  const query = ftsQuery(input.query)
  const execute = database?.execute
  if (execute === undefined || query.length === 0) return null

  try {
    const statement = `SELECT record_type, record_id FROM workspace_search WHERE workspace_search MATCH '${sqlString(query)}' ORDER BY bm25(workspace_search), rowid DESC LIMIT ${String(MAX_INDEX_CANDIDATES)}`
    const raw = await execute.call(database, { raw: statement })
    const result = (raw ?? {}) as RawSearchResult
    const candidates = (result.rows ?? result.results ?? [])
      .map(rowCandidate)
      .filter((candidate): candidate is IndexedCandidate => candidate !== null)
    const byType = new Map(definitions.map((definition) => [definition.recordType, definition]))
    const hydrated = await Promise.all(
      candidates.map(async (candidate) => {
        const definition = byType.get(candidate.recordType)
        if (definition === undefined) return null
        try {
          const doc = await payload.findByID({
            collection: definition.collection,
            id: candidate.id,
            depth: 0,
            overrideAccess: false,
            user: input.user,
          })
          return resultOf(definition, doc)
        } catch {
          // A stale index row or an inaccessible record is not a search result.
          return null
        }
      }),
    )
    return hydrated.filter((result): result is SearchResult => result !== null).slice(0, 20)
  } catch {
    // Older tenant databases may not have the migration yet; retain a safe, scoped fallback during rollout.
    return null
  }
}

async function likeSearch(
  payload: Payload,
  input: SearchInput,
  definitions: readonly SearchDefinition[],
): Promise<readonly SearchResult[]> {
  const q = input.query.trim()
  const responses = await Promise.all(
    definitions.map((definition) =>
      payload.find({
        collection: definition.collection,
        where: { or: definition.searchFields.map((field) => ({ [field]: { like: q } })) },
        sort: '-updatedAt',
        limit: 5,
        depth: 0,
        overrideAccess: false,
        user: input.user,
      }),
    ),
  )
  return definitions
    .flatMap((definition, index) => (responses[index]?.docs ?? []).map((doc) => resultOf(definition, doc)))
    .slice(0, 20)
}

/** Searches the FTS5 index through Payload access, with a scoped LIKE fallback for pre-index databases. */
export async function scopedSearch(payload: Payload, input: SearchInput): Promise<readonly SearchResult[]> {
  const q = input.query.trim()
  if (q.length < 2 || q.length > 80) throw new Error('Search must contain between 2 and 80 characters.')
  const definitions = input.definitions ?? SEARCH_DEFINITIONS
  return (await indexedSearch(payload, input, definitions)) ?? likeSearch(payload, input, definitions)
}
