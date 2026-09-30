import type { ArchivedRecord, CrmRecordType } from '@ops/module-crm'
import { crmDeps } from '../container'
import type { ProductContext } from '../auth/context'

const TYPES: readonly CrmRecordType[] = ['lead', 'deal', 'contact', 'organization']

/** Every archived record the actor may read, newest archived first. */
export async function loadArchived(context: ProductContext): Promise<ArchivedRecord[]> {
  const deps = await crmDeps(context)
  const lists = await Promise.all(TYPES.map((type) => deps.repo.listArchived(type)))
  return lists.flat().toSorted((a, b) => b.archivedAt - a.archivedAt)
}
