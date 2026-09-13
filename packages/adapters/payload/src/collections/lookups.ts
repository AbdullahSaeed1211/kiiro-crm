import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, spikeCollection, textField } from './fields'

type LookupSlug = typeof COLLECTIONS.sources | typeof COLLECTIONS.lostReasons

const lookupCollection = (slug: LookupSlug) =>
  spikeCollection({
    slug,
    admin: { group: ADMIN_GROUPS.configuration, useAsTitle: 'name' },
    fields: [textField('name', { required: true, unique: true, maxLength: 120 })],
  })

/** Lead sources such as referral or website form (spec §10.1). */
export const sourcesCollection = lookupCollection(COLLECTIONS.sources)

/** Reasons a lead or deal was lost (spec §10.1). */
export const lostReasonsCollection = lookupCollection(COLLECTIONS.lostReasons)
