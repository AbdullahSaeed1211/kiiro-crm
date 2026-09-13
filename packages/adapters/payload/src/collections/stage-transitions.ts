import { COLLECTIONS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  countField,
  epochMs,
  recordReference,
  relationshipTo,
  selectOf,
  spikeCollection,
  textField,
} from './fields'
import { STAGE_CATEGORY_VALUES } from './values'

/** Append-only stage history (platform `StageTransition`, spec §9.4); only system writes reach it. */
export const stageTransitionsCollection = spikeCollection({
  slug: COLLECTIONS.stageTransitions,
  admin: { group: ADMIN_GROUPS.system, defaultColumns: ['recordType', 'recordId', 'toStageId', 'changedAt'] },
  fields: [
    ...recordReference({ required: true }),
    relationshipTo('workflow', COLLECTIONS.workflows, { required: true }),
    textField('fromStageId', { required: true }),
    textField('toStageId', { required: true }),
    selectOf('fromCategory', STAGE_CATEGORY_VALUES, { required: true }),
    selectOf('toCategory', STAGE_CATEGORY_VALUES, { required: true }),
    // Empty for system changes such as jobs and intake, whose actor is not a user.
    relationshipTo('changedBy', COLLECTIONS.users),
    epochMs('changedAt', { required: true }),
    countField('durationMs', { required: true }),
  ],
  indexes: [{ fields: ['recordType', 'recordId', 'changedAt'] }],
})
