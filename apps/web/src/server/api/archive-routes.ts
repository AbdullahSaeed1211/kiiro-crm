import { archiveRecord, restoreRecord, type CrmRecordType } from '@ops/module-crm'
import { archiveWork, restoreWork, type WorkRecordType } from '@ops/module-work'
import { domainError, err, type Result } from '@ops/kernel'
import { crmDeps, workCommandDeps, type RequestContext } from '../container'
import { apiRoute, readBody } from './http'
import { z } from 'zod'

type ArchivableType = CrmRecordType | WorkRecordType

const restoreSchema = z.object({ expectedUpdatedAt: z.number().int().min(0) }).strict()

const isWork = (type: ArchivableType): type is WorkRecordType => type === 'task' || type === 'project'

async function archive(context: RequestContext, input: { type: ArchivableType; id: string; version?: number }) {
  const body = {
    type: input.type,
    id: input.id,
    ...(input.version === undefined ? {} : { expectedUpdatedAt: input.version }),
  }
  return isWork(input.type)
    ? archiveWork(await workCommandDeps(context), body)
    : archiveRecord(await crmDeps(context), body)
}

async function restore(context: RequestContext, input: { type: ArchivableType; id: string; version: number }) {
  const body = { type: input.type, id: input.id, expectedUpdatedAt: input.version }
  return isWork(input.type)
    ? restoreWork(await workCommandDeps(context), body)
    : restoreRecord(await crmDeps(context), body)
}

/** `DELETE /api/v1/<noun>/:id`: archives the record (soft delete); `?expectedUpdatedAt=` guards against a stale copy. */
export function archiveRoute(type: ArchivableType) {
  return apiRoute<{ id: string }>(async ({ request, params, context }) => {
    const raw = new URL(request.url).searchParams.get('expectedUpdatedAt')
    const version = raw === null ? undefined : Number(raw)
    if (version !== undefined && (!Number.isInteger(version) || version < 0))
      return err(domainError('VALIDATION', 'expectedUpdatedAt must be a whole number.'))
    return archive(context, { type, id: params.id, ...(version === undefined ? {} : { version }) })
  })
}

/** `POST /api/v1/<noun>/:id/restore`: brings an archived record back while it is still at `expectedUpdatedAt`. */
export function restoreRoute(type: ArchivableType) {
  return apiRoute<{ id: string }>(async ({ request, params, context }): Promise<Result<unknown>> => {
    const body = await readBody(request, restoreSchema)
    return body.ok ? restore(context, { type, id: params.id, version: body.value.expectedUpdatedAt }) : body
  })
}
