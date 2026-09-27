import { listCrmPage } from '@ops/adapter-payload'
import { ok, type Result } from '@ops/kernel'
import type { CrmRecords, CrmRecordType } from '@ops/module-crm'
import type { RequestContext } from '@/server/container'

const MAX_LIMIT = 100

/** One page of CRM records the actor may see, newest first; `page` and `limit` come from the query string. */
export async function listRecords<T extends CrmRecordType>(
  context: RequestContext,
  type: T,
  url: URL,
): Promise<Result<{ readonly records: readonly CrmRecords[T][]; readonly total: number; readonly page: number }>> {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get('limit')) || 50))
  const result = await listCrmPage(context.req, { type, where: {}, page, limit })
  return ok({ ...result, page })
}
