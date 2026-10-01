import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, countField, jsonField, spikeCollection } from './fields'

/** Which documents the demo data created, in batches, so one call can remove exactly those and nothing else. */
export const demoManifestsCollection = spikeCollection({
  slug: COLLECTIONS.demoManifests,
  admin: { group: ADMIN_GROUPS.system, defaultColumns: ['part', 'createdAt'] },
  fields: [
    // Batches are read back in this order; the purge deletes them in reverse so children go before parents.
    countField('part', { required: true, index: true }),
    // Each entry is { collection, id }.
    jsonField('entries'),
  ],
})
