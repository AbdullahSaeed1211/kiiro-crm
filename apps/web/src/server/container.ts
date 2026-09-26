import { createCrmRepository, createTaskRepository, createUnitOfWork } from '@ops/adapter-payload'
import { systemClock } from '@ops/kernel'
import type { CrmDeps } from '@ops/module-crm'
import type { WorkDeps as WorkCommandDeps } from '@ops/module-work'
import { can, type Actor } from '@ops/platform'
import { type Payload, type PayloadRequest } from 'payload'
import { cache } from 'react'
import { getProductContext } from './auth/context'
import type { WorkDeps } from './work/task-repository'

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

/** Per-request CRM dependencies for the signed-in user. */
export async function crmDeps(requestContext?: RequestContext): Promise<CrmDeps> {
  const { req, actor } = requestContext ?? (await getRequestContext())
  return { actor, can, repo: createCrmRepository(req), uow: createUnitOfWork(req), clock: systemClock }
}

/** Per-request work dependencies for the signed-in user. */
export async function workDeps(requestContext?: RequestContext): Promise<WorkDeps> {
  const { req, actor } = requestContext ?? (await getRequestContext())
  return { actor, can, tasks: createTaskRepository(req), uow: createUnitOfWork(req), clock: systemClock }
}

const RELATED_COLLECTIONS: Readonly<
  Partial<Record<string, 'organizations' | 'projects' | 'tasks' | 'contacts' | 'leads' | 'deals'>>
> = {
  organization: 'organizations',
  project: 'projects',
  task: 'tasks',
  contact: 'contacts',
  lead: 'leads',
  deal: 'deals',
}

/** Builds the authorized command boundary for work mutations. */
export async function workCommandDeps(requestContext?: RequestContext): Promise<WorkCommandDeps> {
  const context = requestContext ?? (await getRequestContext())
  return {
    actor: context.actor,
    can,
    repo: createTaskRepository(context.req),
    uow: createUnitOfWork(context.req),
    clock: systemClock,
    readRecord: async (type: string, id: string): Promise<boolean> => {
      const collection = RELATED_COLLECTIONS[type]
      if (collection === undefined) return false
      const result = await context.payload.find({
        collection,
        where: { id: { equals: id } },
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: false,
        req: context.req,
      })
      return result.totalDocs > 0
    },
  }
}
