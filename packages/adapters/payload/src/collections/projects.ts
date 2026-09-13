import { COLLECTIONS, FIELDS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  customDataField,
  epochMs,
  hasManyTo,
  relationshipTo,
  spikeCollection,
  stageFields,
  textField,
} from './fields'

/** Longest project description (spec §10.2). */
export const PROJECT_DESCRIPTION_MAX = 20_000

/** Project records (spec §10.2). */
export const projectsCollection = spikeCollection({
  slug: COLLECTIONS.projects,
  admin: { group: ADMIN_GROUPS.records, useAsTitle: 'name', defaultColumns: ['name', FIELDS.owner, 'stageId'] },
  fields: [
    textField('name', { required: true, maxLength: 200 }),
    relationshipTo('organization', COLLECTIONS.organizations, { index: true }),
    relationshipTo(FIELDS.owner, COLLECTIONS.users, { index: true }),
    hasManyTo(FIELDS.members, COLLECTIONS.users),
    ...stageFields(),
    epochMs('startAt'),
    epochMs('targetEndAt'),
    { name: 'description', type: 'textarea', maxLength: PROJECT_DESCRIPTION_MAX },
    customDataField(),
  ],
})
