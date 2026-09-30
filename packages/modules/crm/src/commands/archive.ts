import { asId, ok } from '@ops/kernel'
import { z } from 'zod'
import { accessDenied, createActivity, executeCommand, failure, parse, type CrmResult } from '../domain/helpers'
import type { CrmRecordType } from '../ports/records'
import type { CrmDeps } from '../ports/repository'

const archiveSchema = z
  .object({
    type: z.enum(['organization', 'contact', 'lead', 'deal']),
    id: z.string().trim().min(1),
    /** Omitted when the caller archives whatever version is current. */
    expectedUpdatedAt: z.number().int().min(0).optional(),
  })
  .strict()

async function archiveWork(deps: CrmDeps, input: unknown): Promise<CrmResult<{ type: CrmRecordType; id: string }>> {
  const parsed = parse(archiveSchema, input)
  if (!parsed.ok) return parsed
  const { type, id, expectedUpdatedAt } = parsed.value
  const current = await deps.repo.get(type, asId(id))
  if (current === undefined) return failure('NOT_FOUND', `${type} not found`)
  const denied = accessDenied<{ type: CrmRecordType; id: string }>({ type, deps, record: {}, action: 'delete' })
  if (denied !== undefined) return denied
  return deps.uow.run(async () => {
    if (!(await deps.repo.archive(type, asId(id), expectedUpdatedAt ?? current.updatedAt)))
      return failure('CONFLICT', `${type} was updated by someone else`)
    await createActivity({ deps, record: { type, id: asId(id) }, verb: 'record.archived' })
    return ok({ type, id })
  })
}

/** Archives a record: it leaves every list and search, and only owners and managers may do it. */
export function archiveRecord(deps: CrmDeps, input: unknown): Promise<CrmResult<{ type: CrmRecordType; id: string }>> {
  return executeCommand(deps, input, archiveWork)
}

const restoreSchema = z
  .object({
    type: z.enum(['organization', 'contact', 'lead', 'deal']),
    id: z.string().trim().min(1),
    expectedUpdatedAt: z.number().int().min(0),
  })
  .strict()

async function restoreWork(deps: CrmDeps, input: unknown): Promise<CrmResult<{ type: CrmRecordType; id: string }>> {
  const parsed = parse(restoreSchema, input)
  if (!parsed.ok) return parsed
  const { type, id, expectedUpdatedAt } = parsed.value
  const denied = accessDenied<{ type: CrmRecordType; id: string }>({ type, deps, record: {}, action: 'delete' })
  if (denied !== undefined) return denied
  if (!(await deps.repo.restore(type, asId(id), expectedUpdatedAt)))
    return failure('CONFLICT', `${type} is not archived, or was changed meanwhile`)
  await createActivity({ deps, record: { type, id: asId(id) }, verb: 'record.restored' })
  return ok({ type, id })
}

/** Brings an archived record back into every list and search; only owners and managers may do it. */
export function restoreRecord(deps: CrmDeps, input: unknown): Promise<CrmResult<{ type: CrmRecordType; id: string }>> {
  return executeCommand(deps, input, restoreWork)
}
