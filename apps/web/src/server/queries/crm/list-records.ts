import { listCrmPage } from '@ops/adapter-payload'
import { domainError, err, ok, type Result } from '@ops/kernel'
import type { CrmRecords, CrmRecordType } from '@ops/module-crm'
import type { Where } from 'payload'
import type { RequestContext } from '@/server/container'
import { pageOf, pageWindowOf, type PageOf } from '../../api/page-window'

/** The fields `?q=` searches for each record type. */
const SEARCH_FIELDS: Readonly<Record<CrmRecordType, readonly string[]>> = {
  organization: ['name', 'email', 'website'],
  contact: ['firstName', 'lastName', 'email'],
  lead: ['title', 'firstName', 'lastName', 'email', 'companyName'],
  deal: ['title'],
}

/** Sorts a list may ask for with `?sort=`; the id always breaks ties so pages never overlap. */
const SORTS: Readonly<Record<string, readonly string[] | undefined>> = {
  '-createdAt': ['-createdAt', 'id'],
  createdAt: ['createdAt', 'id'],
  '-updatedAt': ['-updatedAt', 'id'],
  updatedAt: ['updatedAt', 'id'],
}

/** A query-string value, or undefined when it is missing or empty. */
function param(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name)?.trim()
  return value === undefined || value === '' ? undefined : value
}

/** `?q=` (text in the searchable fields), `?ownerId=` and `?stageId=` narrow a list; each applies only when it fits. */
function filtersOf(type: CrmRecordType, url: URL): Where {
  const q = param(url, 'q')
  const ownerId = param(url, 'ownerId')
  const stageId = type === 'lead' || type === 'deal' ? param(url, 'stageId') : undefined
  const clauses: Where[] = [
    ...(q === undefined ? [] : [{ or: SEARCH_FIELDS[type].map((field) => ({ [field]: { contains: q } })) }]),
    ...(ownerId === undefined ? [] : [{ owner: { equals: ownerId } }]),
    ...(stageId === undefined ? [] : [{ stageId: { equals: stageId } }]),
  ]
  return clauses.length === 0 ? {} : { and: clauses }
}

/** One page of CRM records the actor may see, newest first unless `?sort=` says otherwise. */
export async function listRecords<T extends CrmRecordType>(
  context: RequestContext,
  type: T,
  url: URL,
): Promise<Result<PageOf<CrmRecords[T]>>> {
  const window = pageWindowOf(url)
  if (!window.ok) return window
  const sortName = url.searchParams.get('sort') ?? '-createdAt'
  const sort = SORTS[sortName]
  if (sort === undefined) return err(domainError('VALIDATION', `sort must be one of ${Object.keys(SORTS).join(', ')}.`))
  const found = await listCrmPage(context.req, {
    type,
    where: filtersOf(type, url),
    sort: [...sort],
    page: window.value.page,
    limit: window.value.limit,
  })
  return ok(pageOf(found, window.value))
}
