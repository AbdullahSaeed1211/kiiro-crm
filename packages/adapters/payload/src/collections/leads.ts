import { COLLECTIONS, FIELDS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  customDataField,
  epochMs,
  lostFields,
  ownershipFields,
  personFields,
  relationshipTo,
  spikeCollection,
  stageFields,
  textField,
  titleField,
} from './fields'

/** Lead records (spec §10.1); `createdAt` is indexed by the timestamps Payload adds. */
export const leadsCollection = spikeCollection({
  slug: COLLECTIONS.leads,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'title',
    defaultColumns: ['title', 'email', 'stageId', FIELDS.owner, 'source'],
  },
  fields: [
    titleField(),
    ...personFields(),
    textField('companyName', { maxLength: 200 }),
    relationshipTo('organization', COLLECTIONS.organizations),
    relationshipTo('source', COLLECTIONS.sources, { index: true }),
    ...ownershipFields(),
    ...stageFields(),
    ...lostFields(),
    epochMs('convertedAt', { index: true }),
    relationshipTo('convertedDeal', COLLECTIONS.deals),
    customDataField(),
  ],
})
