import type { ArrayField } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, selectOf, spikeCollection, textField } from './fields'
import { STAGE_CATEGORY_VALUES, STAGE_COLOR_VALUES, RECORD_TYPE_VALUES } from './values'
import { ensureStageId, MAX_STAGES, stagesOf, validateDefaultStage, validateStages } from './workflow-rules'

const stagesField: ArrayField = {
  name: 'stages',
  type: 'array',
  maxRows: MAX_STAGES,
  validate: (value) => validateStages(value),
  fields: [
    {
      name: 'id',
      type: 'text',
      admin: { readOnly: true },
      defaultValue: () => crypto.randomUUID(),
      // Before validation, so the default stage check already sees the ids of stages added in the same save.
      hooks: { beforeValidate: [({ value }) => ensureStageId(value)] },
    },
    textField('name', { required: true, maxLength: 60 }),
    selectOf('category', STAGE_CATEGORY_VALUES, { required: true }),
    selectOf('color', STAGE_COLOR_VALUES, { required: true, defaultValue: 'gray' }),
    { name: 'position', type: 'number', required: true, min: 0 },
    { name: 'probability', type: 'number', min: 0, max: 100 },
  ],
}

/** Stage lists per record type with the §9.4 invariants enforced as field validation. */
export const workflowsCollection = {
  ...spikeCollection({
    slug: COLLECTIONS.workflows,
    admin: { group: ADMIN_GROUPS.configuration, useAsTitle: 'name', defaultColumns: ['name', 'recordType'] },
    fields: [
      selectOf('recordType', RECORD_TYPE_VALUES, { required: true, index: true }),
      textField('name', { required: true, maxLength: 120 }),
      stagesField,
      {
        name: 'defaultStageId',
        type: 'text',
        validate: (value: unknown, { siblingData }: { readonly siblingData: unknown }) =>
          validateDefaultStage(value, stagesOf(siblingData)),
      },
    ],
  }),
  // A copy would keep the stage ids that records and the default stage point at.
  disableDuplicate: true,
}
