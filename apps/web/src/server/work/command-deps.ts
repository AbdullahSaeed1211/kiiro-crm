import { createTaskRepository, createUnitOfWork } from '@ops/adapter-payload'
import { systemClock } from '@ops/kernel'
import type { WorkDeps } from '@ops/module-work'
import { can } from '@ops/platform'
import { getRequestContext, type RequestContext } from './deps'

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
export async function getWorkCommandDeps(requestContext?: RequestContext): Promise<WorkDeps> {
  const context = requestContext ?? (await getRequestContext())
  return {
    actor: context.actor,
    can,
    repo: createTaskRepository(context.req),
    uow: createUnitOfWork(context.req),
    clock: systemClock,
    readRecord: async (type, id) => {
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
