import {
  createCrmRepository,
  createIdentityRepository,
  createTaskRepository,
  createUnitOfWork,
} from '@ops/adapter-payload'
import { systemClock } from '@ops/kernel'
import type { CrmDeps } from '@ops/module-crm'
import type { IdentityDeps, InvitationToken } from '@ops/module-identity'
import type { WorkDeps as WorkCommandDeps } from '@ops/module-work'
import { can, type Actor } from '@ops/platform'
import { type Payload, type PayloadRequest } from 'payload'
import { cache } from 'react'
import { getProductContext } from './auth/context'
import { dealWonPlaybook } from './crm/deal-won'
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
  const context = requestContext ?? (await getRequestContext())
  const { payload, req, actor } = context
  const repo = createCrmRepository(req)
  const onDealWon = dealWonPlaybook({ payload, req, crm: repo, work: () => workCommandDeps(context) })
  return { actor, can, repo, uow: createUnitOfWork(req), clock: systemClock, onDealWon }
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

const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

/** A 256-bit random invitation token and its SHA-256 hash; only the hash is stored. */
async function newInvitationToken(): Promise<InvitationToken> {
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = hex(tokenBytes)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return { token, tokenHash: hex(new Uint8Array(digest)) }
}

/** Per-request membership dependencies for the signed-in user. */
export async function identityDeps(requestContext?: RequestContext): Promise<IdentityDeps> {
  const { req, actor } = requestContext ?? (await getRequestContext())
  return { actor, can, repo: createIdentityRepository(req), now: () => systemClock.now(), newToken: newInvitationToken }
}
