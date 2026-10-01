import { asId, ok } from '@ops/kernel'
import { z } from 'zod'
import type { WorkDeps, WorkRecordType, WorkResult } from '../ports/work'
import { fail, isManagerUp } from './input'

const archiveSchema = z
  .object({
    type: z.enum(['task', 'project']),
    id: z.string().trim().min(1),
    /** Omitted when the caller archives whatever version is current. */
    expectedUpdatedAt: z.number().int().min(0).optional(),
  })
  .strict()

const restoreSchema = z
  .object({
    type: z.enum(['task', 'project']),
    id: z.string().trim().min(1),
    expectedUpdatedAt: z.number().int().min(0),
  })
  .strict()

interface Archived {
  type: WorkRecordType
  id: string
}

/** Adds the change to the record's activity feed. */
async function record(deps: WorkDeps, entry: { type: WorkRecordType; id: string; verb: string }): Promise<void> {
  await deps.repo.addActivity({
    record: { type: entry.type, id: asId(entry.id) },
    verb: entry.verb,
    actorId: deps.actor.id,
    data: {},
    occurredAt: deps.clock.now(),
  })
}

async function currentVersion(deps: WorkDeps, type: WorkRecordType, id: string): Promise<number | undefined> {
  const record = type === 'task' ? await deps.repo.getTask(asId(id)) : await deps.repo.getProject(asId(id))
  return record?.updatedAt
}

/** Archives a task or project: it leaves every list and search, and only owners and managers may do it. */
export async function archiveWork(deps: WorkDeps, input: unknown): Promise<WorkResult<Archived>> {
  const parsed = archiveSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Choose a task or project to archive.')
  const { type, id, expectedUpdatedAt } = parsed.data
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'Only owners and managers can archive this.')
  const current = await currentVersion(deps, type, id)
  if (current === undefined) return fail('NOT_FOUND', `${type} not found`)
  const archived = await deps.uow.run(async () => {
    if (!(await deps.repo.archive(type, asId(id), expectedUpdatedAt ?? current))) return false
    await record(deps, { type, id, verb: 'record.archived' })
    return true
  })
  return archived ? ok({ type, id }) : fail('CONFLICT', `${type} was updated by someone else`)
}

/** Brings an archived task or project back into every list and search; only owners and managers may do it. */
export async function restoreWork(deps: WorkDeps, input: unknown): Promise<WorkResult<Archived>> {
  const parsed = restoreSchema.safeParse(input)
  if (!parsed.success) return fail('VALIDATION', 'Choose a task or project to restore.')
  const { type, id, expectedUpdatedAt } = parsed.data
  if (!isManagerUp(deps.actor)) return fail('FORBIDDEN', 'Only owners and managers can restore this.')
  const restored = await deps.uow.run(async () => {
    if (!(await deps.repo.restore(type, asId(id), expectedUpdatedAt))) return false
    await record(deps, { type, id, verb: 'record.restored' })
    return true
  })
  return restored ? ok({ type, id }) : fail('CONFLICT', `${type} is not archived, or was changed meanwhile`)
}
