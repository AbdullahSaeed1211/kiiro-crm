import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, epochMs, jsonField, selectOf, spikeCollection, textField } from './fields'
import { RULE_RUN_STATUS_VALUES } from './values'

/** One row per rule, record and trigger time; the unique key makes a repeated cron invocation a no-op. */
export const ruleRunsCollection = spikeCollection({
  slug: COLLECTIONS.ruleRuns,
  admin: {
    group: ADMIN_GROUPS.system,
    useAsTitle: 'ruleName',
    defaultColumns: ['ruleName', 'recordType', 'status', 'startedAt'],
  },
  fields: [
    textField('key', { required: true, unique: true, maxLength: 300 }),
    textField('ruleId', { required: true, maxLength: 64 }),
    textField('ruleName', { required: true, maxLength: 80 }),
    textField('recordType', { required: true, maxLength: 40 }),
    textField('recordId', { required: true, maxLength: 64 }),
    textField('trigger', { required: true, maxLength: 40 }),
    selectOf('status', RULE_RUN_STATUS_VALUES, { required: true, defaultValue: 'running', index: true }),
    epochMs('startedAt', { required: true, index: true }),
    epochMs('finishedAt'),
    jsonField('actions'),
    textField('error', { maxLength: 2000 }),
  ],
})
