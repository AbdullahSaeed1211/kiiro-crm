import type { Id } from '@ops/kernel'
import type { Payload } from 'payload'
import { expireInvitation, listExpiredInvitations } from './jobs/invitations'
import { listOverdueTargets } from './jobs/overdue'
import { listDigestTargets } from './jobs/digests'
import { listStalledTargets } from './jobs/stalled'
import { purgeRejected } from './jobs/rejected'
import { createJobRunStore } from './jobs/run-store'
import type { JobCursor } from './jobs/cursor'
import type { JobTarget } from './jobs/job-targets'

export { createJobRunStore }

/** The six narrow cron source ports the Cloudflare job runner reads and mutates through. */
interface JobSources {
  listExpiredInvitations(
    at: number,
    limit: number,
    cursor?: JobCursor,
  ): Promise<readonly { readonly id: Id; readonly expiresAt: number; readonly updatedAt?: number }[]>
  expireInvitation(id: Id): Promise<void>
  listOverdue(before: number, limit: number, cursor?: JobCursor): Promise<readonly JobTarget[]>
  listDigests(
    ...args: readonly [localDate: string, at: number, limit: number, cursor?: JobCursor]
  ): Promise<readonly JobTarget[]>
  listStalled(before: number, limit: number, cursor?: JobCursor): Promise<readonly JobTarget[]>
  deleteRejected(
    before: number,
    limit: number,
    cursor?: JobCursor,
  ): Promise<{ readonly rows: readonly { readonly id: string; readonly updatedAt: number }[] }>
}

/** Payload read and mutation ports for the non-due-soon scheduled jobs. */
export function createJobSources(payload: Payload, stalledDays: number): JobSources {
  return {
    listExpiredInvitations: (at, limit, cursor) => listExpiredInvitations(payload, { at, limit, cursor }),
    expireInvitation: (id) => expireInvitation(payload, id),
    listOverdue: (before, limit, cursor) => listOverdueTargets(payload, { before, limit, cursor }),
    listDigests: (...[, , limit, cursor]) => listDigestTargets(payload, { limit, cursor }),
    listStalled: (before, limit, cursor) =>
      listStalledTargets(payload, { before: before - stalledDays * 86_400_000, limit, cursor }),
    deleteRejected: (before, limit, cursor) => purgeRejected(payload, { before, limit, cursor }),
  }
}
