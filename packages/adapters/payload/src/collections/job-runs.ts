import { COLLECTIONS } from '../contracts/names'
import { ADMIN_GROUPS, countField, epochMs, jsonField, selectOf, spikeCollection, textField } from './fields'
import { JOB_RUN_STATUS_VALUES } from './values'

/** One row per job and time window (spec §13); the unique pair makes a repeated cron invocation a no-op. */
export const jobRunsCollection = spikeCollection({
  slug: COLLECTIONS.jobRuns,
  admin: { group: ADMIN_GROUPS.system, useAsTitle: 'job', defaultColumns: ['job', 'windowStart', 'status'] },
  fields: [
    textField('job', { required: true, maxLength: 100 }),
    epochMs('windowStart', { required: true }),
    selectOf('status', JOB_RUN_STATUS_VALUES, { required: true, defaultValue: 'running' }),
    countField('processed'),
    countField('created'),
    countField('skipped'),
    countField('durationMs'),
    // Where a job that stopped at its per-run limit continues next window.
    jsonField('cursor'),
  ],
  indexes: [{ fields: ['job', 'windowStart'], unique: true }],
})
