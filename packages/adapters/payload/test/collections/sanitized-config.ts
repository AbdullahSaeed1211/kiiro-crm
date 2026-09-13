import { sanitizeConfig, type Config, type SanitizedConfig } from 'payload'
import { settingsGlobal, spikeCollections } from '../../src/collections'
import { COLLECTIONS } from '../../src/contracts/names'

type SanitizedCollection = SanitizedConfig['collections'][number]

// Sanitizing a config never connects, so the database adapter only has to satisfy the config type.
const unusedDatabase: Config['db'] = {
  defaultIDType: 'text',
  init: () => {
    throw new Error('the collection test never connects to a database')
  },
}

/** Sanitizes the spike collections and the settings global as `buildConfig` does, without a database. */
export function sanitizeSpikeConfig(): Promise<SanitizedConfig> {
  return sanitizeConfig({
    secret: 'collection-test',
    admin: { user: COLLECTIONS.users },
    // Payload appends its own collections to the array it receives, so it gets a copy.
    collections: [...spikeCollections],
    globals: [settingsGlobal],
    graphQL: { disable: true },
    db: unusedDatabase,
  })
}

/** The sanitized collection `slug`; throws when it is missing. */
export function findCollection(config: SanitizedConfig, slug: string): SanitizedCollection {
  const found = config.collections.find((candidate) => candidate.slug === slug)
  if (found === undefined) throw new Error(`missing collection ${slug}`)
  return found
}

/** The flattened field `name` of collection `slug`, or undefined. */
export function findField(config: SanitizedConfig, slug: string, name: string): unknown {
  return findCollection(config, slug).flattenedFields.find((candidate) => candidate.name === name)
}

/** Field paths of each sanitized index of collection `slug`. */
export function indexPathsOf(config: SanitizedConfig, slug: string): string[][] {
  return findCollection(config, slug).sanitizedIndexes.map((index) => index.fields.map((field) => field.path))
}

/** True when `field` is a has-many field. */
export function isHasMany(field: unknown): boolean {
  return typeof field === 'object' && field !== null && 'hasMany' in field && field.hasMany === true
}
