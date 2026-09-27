import type { Payload, Where } from 'payload'
import { COLLECTIONS } from '../../contracts/names'
import type { JobCursor } from './cursor'
import { cursor } from './cursor'

export interface JobRunStore {
  claim(job: string, window: string): Promise<boolean>
  getCursor(job: string): Promise<JobCursor | undefined>
  saveCursor(job: string, cursor: JobCursor | undefined): Promise<void>
}

async function claimJob(payload: Payload, job: string, window: string): Promise<boolean> {
  const windowStart = Number(window.slice(window.lastIndexOf(':') + 1))
  const where: Where = { and: [{ job: { equals: job } }, { windowStart: { equals: windowStart } }] }
  const found = await payload.find({ collection: COLLECTIONS.jobRuns, where, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs.length > 0) return false
  try {
    await payload.create({
      collection: COLLECTIONS.jobRuns,
      data: { job, windowStart, status: 'running' },
      overrideAccess: true,
    })
    return true
  } catch (error) {
    if (error instanceof Error && /unique constraint failed/i.test(error.message)) return false
    throw error
  }
}

async function latestRun(payload: Payload, job: string, status?: string) {
  const page = await payload.find({
    collection: COLLECTIONS.jobRuns,
    where:
      status === undefined
        ? { job: { equals: job } }
        : { and: [{ job: { equals: job } }, { status: { equals: status } }] },
    sort: '-windowStart',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs[0]
}

/** Payload-backed idempotency and continuation state for scheduled jobs. */
export function createJobRunStore(payload: Payload): JobRunStore {
  return {
    claim: (job, window) => claimJob(payload, job, window),
    getCursor: async (job) => {
      // A successful claim inserts a new running row before the dispatcher asks for a cursor.
      // Read the previous completed run so that the new row's empty cursor is never used.
      const row = await latestRun(payload, job, 'completed')
      return row === undefined ? undefined : cursor(row)
    },
    saveCursor: async (job, value) => {
      const row = await latestRun(payload, job)
      if (row !== undefined)
        await payload.update({
          collection: COLLECTIONS.jobRuns,
          id: row.id,
          data: {
            cursor: value === undefined ? null : { id: value.id, updatedAt: value.updatedAt },
            status: 'completed',
          },
          overrideAccess: true,
        })
    },
  }
}
