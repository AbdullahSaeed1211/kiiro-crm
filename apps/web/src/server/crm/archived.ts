import type { ArchivedRecord, CrmRecordType } from '@ops/module-crm'
import type { ArchivedWork } from '@ops/module-work'
import { crmDeps, workCommandDeps } from '../container'
import type { ProductContext } from '../auth/context'

const TYPES: readonly CrmRecordType[] = ['lead', 'deal', 'contact', 'organization']

/** One archived record, task or project for the Archive screen. */
export interface ArchivedItem {
  readonly type: CrmRecordType | 'task' | 'project'
  readonly id: string
  readonly label: string
  readonly archivedAt: number
  readonly updatedAt: number
}

const fromWork = (item: ArchivedWork): ArchivedItem => ({ ...item, id: String(item.id) })
const fromCrm = (item: ArchivedRecord): ArchivedItem => ({ ...item, id: String(item.id) })

/** Every archived record, task and project the actor may read, newest archived first. */
export async function loadArchived(context: ProductContext): Promise<ArchivedItem[]> {
  const [crm, work] = await Promise.all([crmDeps(context), workCommandDeps(context)])
  const [records, tasks, projects] = await Promise.all([
    Promise.all(TYPES.map((type) => crm.repo.listArchived(type))),
    work.repo.listArchived('task'),
    work.repo.listArchived('project'),
  ])
  return [...records.flat().map(fromCrm), ...tasks.map(fromWork), ...projects.map(fromWork)].toSorted(
    (a, b) => b.archivedAt - a.archivedAt,
  )
}
