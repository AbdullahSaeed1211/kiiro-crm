import { COLLECTIONS, FIELDS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  currencyField,
  customDataField,
  epochMs,
  hasManyTo,
  lostFields,
  minorUnitsField,
  ownershipFields,
  relationshipTo,
  spikeCollection,
  stageFields,
  titleField,
} from './fields'

/** Deal records (spec §10.1); the value is integer minor units plus an ISO 4217 code (decision D-10). */
export const dealsCollection = spikeCollection({
  slug: COLLECTIONS.deals,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'title',
    defaultColumns: ['title', 'organization', 'stageId', 'valueAmountMinor', FIELDS.owner],
  },
  fields: [
    titleField(),
    relationshipTo('organization', COLLECTIONS.organizations, { index: true }),
    hasManyTo('contacts', COLLECTIONS.contacts),
    relationshipTo('primaryContact', COLLECTIONS.contacts),
    minorUnitsField('valueAmountMinor'),
    currencyField('valueCurrency'),
    epochMs('expectedCloseAt', { index: true }),
    epochMs('closedAt'),
    ...ownershipFields(),
    ...stageFields(),
    relationshipTo('sourceLead', COLLECTIONS.leads),
    ...lostFields(),
    customDataField(),
  ],
})
