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
  { recordType: 'organization', collection: 'organizations', searchFields: ['name', 'email'], titleField: 'name' },
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
    searchFields: ['title', 'email', 'phone', 'companyName'],
    titleField: 'title',
    subtitleFields: ['email', 'companyName'],
  },
  { recordType: 'deal', collection: 'deals', searchFields: ['title'], titleField: 'title' },
  { recordType: 'project', collection: 'projects', searchFields: ['name'], titleField: 'name' },
  { recordType: 'task', collection: 'tasks', searchFields: ['title'], titleField: 'title' },
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

/** Searches each registered collection through Payload access, limiting each type to five and the response to twenty. */
export async function scopedSearch(payload: Payload, input: SearchInput): Promise<readonly SearchResult[]> {
  const q = input.query.trim()
  if (q.length < 2 || q.length > 80) throw new Error('Search must contain between 2 and 80 characters.')
  const results: SearchResult[] = []
  for (const definition of input.definitions ?? SEARCH_DEFINITIONS) {
    const response = await payload.find({
      collection: definition.collection,
      where: { or: definition.searchFields.map((field) => ({ [field]: { like: q } })) },
      sort: '-updatedAt',
      limit: 5,
      depth: 0,
      overrideAccess: false,
      user: input.user,
    })
    for (const doc of response.docs) {
      results.push(resultOf(definition, doc))
      if (results.length === 20) return results
    }
  }
  return results
}
