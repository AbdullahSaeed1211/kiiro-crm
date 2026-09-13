import { COLLECTIONS, FIELDS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  customDataField,
  epochMs,
  hasManyTo,
  recordReference,
  relationshipTo,
  selectOf,
  spikeCollection,
  stageFields,
  textField,
} from './fields'
import { PROJECT_DESCRIPTION_MAX } from './projects'
import { PRIORITY_VALUES } from './values'

const TASK_TITLE_MAX = 300

/** Task records (spec §10.2); board order is `(rank, id)` within a project stage (decision D-29). */
export const tasksCollection = spikeCollection({
  slug: COLLECTIONS.tasks,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'title',
    defaultColumns: ['title', 'stageId', 'priority', FIELDS.assignees, 'dueAt'],
  },
  fields: [
    textField('title', { required: true, maxLength: TASK_TITLE_MAX }),
    { name: 'description', type: 'textarea', maxLength: PROJECT_DESCRIPTION_MAX },
    relationshipTo(FIELDS.project, COLLECTIONS.projects),
    ...recordReference({}, { type: 'relatedType', id: 'relatedId' }),
    relationshipTo('parentTask', COLLECTIONS.tasks, { index: true }),
    ...stageFields(),
    textField('rank', { maxLength: 64 }),
    selectOf('priority', PRIORITY_VALUES, { required: true, defaultValue: 'none' }),
    hasManyTo(FIELDS.assignees, COLLECTIONS.users),
    relationshipTo(FIELDS.group, COLLECTIONS.groups),
    epochMs('startAt'),
    epochMs('dueAt', { index: true }),
    epochMs('completedAt'),
    customDataField(),
  ],
  indexes: [{ fields: [FIELDS.project, 'stageId', 'rank'] }, { fields: ['relatedType', 'relatedId'] }],
})
