import type { NotificationStore } from '@ops/platform'
import type { CronJob } from '../../../cloudflare/src/cron/cron-job'
import type { ScheduledJobsDeps } from '../../../cloudflare/src/cron/jobs'
import { describe, expect, it } from 'vitest'
import { createScheduledJobs } from '../../../cloudflare/src/cron/jobs'

const dueSoon: CronJob = {
  name: 'tasks.dueSoon',
  run: () => Promise.resolve({ ok: true, value: { processed: 0, created: 0, skipped: 0 } }),
}

const notifications: NotificationStore = {
  insertIfAbsent: () => Promise.resolve('created'),
}

const deps: ScheduledJobsDeps = {
  source: {},
  notifications,
  timeZone: 'UTC',
}

describe('createScheduledJobs', () => {
  it('registers all six jobs in the specification order and preserves due-soon identity', () => {
    const jobs = createScheduledJobs(deps, dueSoon)

    expect(jobs).toHaveLength(6)
    expect(jobs.map((job) => job.name)).toEqual([
      'invitations.expire',
      'tasks.dueSoon',
      'tasks.overdue',
      'digest.send',
      'records.stalled',
      'intake.cleanup',
    ])
    expect(jobs[1]).toBe(dueSoon)
  })
})
