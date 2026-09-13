import config from '@payload-config'
import { createTaskRepository, createUnitOfWork, resolveActor } from '@ops/adapter-payload'
import { systemClock } from '@ops/kernel'
import { can } from '@ops/platform'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createLocalReq, getPayload } from 'payload'
import type { WorkDeps } from './task-repository'

// Product login pages arrive in M5; until then sessions come from the admin login.
const LOGIN_PATH = '/admin/login'

/** Per-request work dependencies for the signed-in user; redirects to login without an active session. */
export async function getWorkDeps(): Promise<WorkDeps> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user === null) redirect(LOGIN_PATH)
  const req = await createLocalReq({ user }, payload)
  const actor = await resolveActor(req)
  if (actor?.active !== true) redirect(LOGIN_PATH)
  return { actor, can, tasks: createTaskRepository(req), uow: createUnitOfWork(req), clock: systemClock }
}
