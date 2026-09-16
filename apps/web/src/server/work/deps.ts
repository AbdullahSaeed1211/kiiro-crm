import { createTaskRepository, createUnitOfWork } from '@ops/adapter-payload'
import { systemClock } from '@ops/kernel'
import { can, type Actor } from '@ops/platform'
import { type Payload, type PayloadRequest } from 'payload'
import { cache } from 'react'
import { getProductContext } from '../auth/context'
import type { WorkDeps } from './task-repository'

/** The signed-in request: Payload, a local request carrying the user, and the actor. */
export interface RequestContext {
  readonly payload: Payload
  readonly req: PayloadRequest
  readonly actor: Actor
}

/** Resolves the signed-in user; redirects to login without an active session. */
export const getRequestContext = cache(async (): Promise<RequestContext> => {
  const { payload, req, actor } = await getProductContext()
  return { payload, req, actor }
})

/** Per-request work dependencies for the signed-in user. */
export async function getWorkDeps(requestContext?: RequestContext): Promise<WorkDeps> {
  const { req, actor } = requestContext ?? (await getRequestContext())
  return { actor, can, tasks: createTaskRepository(req), uow: createUnitOfWork(req), clock: systemClock }
}
