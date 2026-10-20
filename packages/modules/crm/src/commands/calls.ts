import { asId, ok, type Id } from '@ops/kernel'
import type { CallLogRecord } from '../ports/records'
import type { CrmDeps } from '../ports/repository'
import {
  accessDenied,
  cleanNullable,
  createActivity,
  executeCommand,
  failure,
  parse,
  type CrmResult,
} from '../domain/helpers'
import { logCallSchema } from '../schema'

/** Records a call on a visible lead or contact; the actor is always the authenticated caller. */
async function logCallWork(deps: CrmDeps, input: unknown): Promise<CrmResult<CallLogRecord>> {
  const parsed = parse(logCallSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const recordId = asId(value.recordId)
  const record = await deps.repo.get(value.recordType, recordId)
  if (record === undefined) return failure('NOT_FOUND', `${value.recordType} not found`)
  const denied = accessDenied<CallLogRecord>({ type: value.recordType, deps, record })
  if (denied !== undefined) return denied
  const saved = await deps.repo.createCallLog({
    recordType: value.recordType,
    recordId,
    callerId: deps.actor.id,
    occurredAt: value.occurredAt,
    outcome: value.outcome,
    notes: cleanNullable(value.notes),
  })
  await createActivity({
    deps,
    record: { type: value.recordType, id: recordId },
    verb: 'field.changed',
    data: { field: 'call', outcome: saved.outcome, occurredAt: saved.occurredAt },
  })
  return ok(saved)
}

/** Logs the authenticated actor's call outcome against a visible lead or contact. */
export function logCall(deps: CrmDeps, input: unknown): Promise<CrmResult<CallLogRecord>> {
  return executeCommand(deps, input, logCallWork)
}

/** Reads call history only after the parent CRM record passes the request user's scoped read. */
export async function listCallLogs(
  deps: CrmDeps,
  recordType: 'lead' | 'contact',
  recordId: Id,
): Promise<CrmResult<readonly CallLogRecord[]>> {
  const parent = await deps.repo.get(recordType, recordId)
  if (parent === undefined) return failure('NOT_FOUND', `${recordType} not found`)
  return ok(await deps.repo.listCallLogs(recordType, recordId))
}
