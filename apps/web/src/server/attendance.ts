import { createAttendanceRepository } from '@ops/adapter-payload'
import { systemClock } from '@ops/kernel'
import type { AttendanceDeps } from '@ops/module-work'
import type { RequestContext } from './container'

/** No caller-supplied identity or receipt timestamp crosses this boundary. */
export function attendanceDeps(context: RequestContext): AttendanceDeps {
  return { actor: context.actor, clock: systemClock, repo: createAttendanceRepository(context.req) }
}
