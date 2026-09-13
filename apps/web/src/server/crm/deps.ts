import { createCrmRepository, createUnitOfWork } from '@ops/adapter-payload'
import { systemClock } from '@ops/kernel'
import type { CrmDeps } from '@ops/module-crm'
import { can } from '@ops/platform'
import { getRequestContext } from '../work/deps'

/** Per-request CRM dependencies for the signed-in user. */
export async function getCrmDeps(): Promise<CrmDeps> {
  const { req, actor } = await getRequestContext()
  return { actor, can, repo: createCrmRepository(req), uow: createUnitOfWork(req), clock: systemClock }
}
