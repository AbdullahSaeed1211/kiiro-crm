import { asId, err, invalidInput, ok, type Id } from '@ops/kernel'
import type { DeliverableRecord, WorkDeps, WorkResult } from '../ports/work'
import { createDeliverableSchema, respondToDeliverableSchema } from '../schema'
import {
  conflict,
  editableProject,
  FIELD_CHANGED,
  forbidden,
  notFound,
  nullableText,
  PROJECT_RECORD,
  responsibleOwner,
} from './agency-work-support'

async function persistDeliverable(deps: WorkDeps, input: Omit<DeliverableRecord, 'id' | 'createdAt' | 'updatedAt'>) {
  return deps.uow.run(async () => {
    const record = await deps.repo.createDeliverable(input)
    await deps.repo.addActivity({
      record: { type: PROJECT_RECORD, id: record.projectId },
      verb: FIELD_CHANGED,
      actorId: deps.actor.id,
      occurredAt: deps.clock.now(),
      data: { field: 'deliverable', deliverableId: record.id, title: record.title, status: record.status },
    })
    return record
  })
}

function isLegalDeliverableResponse(current: DeliverableRecord['status'], next: string): boolean {
  return (
    (current === 'draft' && next === 'sent_to_client') ||
    (current === 'sent_to_client' && (next === 'approved' || next === 'changes_requested')) ||
    (current === 'changes_requested' && next === 'sent_to_client')
  )
}

async function persistDeliverableResponse(input: {
  readonly deps: WorkDeps
  readonly projectId: Id
  readonly deliverable: DeliverableRecord
  readonly patch: Parameters<WorkDeps['repo']['updateDeliverable']>[1]
  readonly expectedUpdatedAt: number
  readonly status: string
  readonly occurredAt: number
}) {
  const { deps, projectId, deliverable, patch, expectedUpdatedAt, status, occurredAt } = input
  return deps.uow.run(async () => {
    const updated = await deps.repo.updateDeliverable(deliverable.id, patch, expectedUpdatedAt)
    if (updated === undefined) return undefined
    await deps.repo.addActivity({
      record: { type: PROJECT_RECORD, id: projectId },
      verb: FIELD_CHANGED,
      actorId: deps.actor.id,
      occurredAt,
      data: {
        field: 'deliverable.response',
        deliverableId: updated.id,
        title: updated.title,
        status,
        responseNote: updated.responseNote,
      },
    })
    return updated
  })
}

async function attachmentBelongsToProject(deps: WorkDeps, projectId: Id, attachmentId: Id | null): Promise<boolean> {
  if (attachmentId === null) return true
  return (await deps.readProjectAttachment?.(projectId, attachmentId)) === true
}

/** Creates a project deliverable with one responsible active project member. */
export async function createDeliverable(deps: WorkDeps, input: unknown): Promise<WorkResult<DeliverableRecord>> {
  const parsed = createDeliverableSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('Deliverable details are invalid.', parsed.error.issues))
  const value = parsed.data
  const project = await editableProject(deps, asId(value.projectId))
  if (project === undefined) return notFound('Project')
  const owner = await responsibleOwner({
    deps,
    project,
    actorId: deps.actor.id,
    ...(value.ownerId === undefined ? {} : { requestedOwner: value.ownerId }),
  })
  if (!owner.ok) return owner
  const attachmentId = value.attachmentId ? asId(value.attachmentId) : null
  if (!(await attachmentBelongsToProject(deps, project.id, attachmentId)))
    return forbidden('Choose a file attached to this project.')
  return ok(
    await persistDeliverable(deps, {
      projectId: project.id,
      title: value.title,
      ownerId: owner.value,
      linkUrl: value.linkUrl ?? null,
      attachmentId,
      status: 'draft',
      sentAt: null,
      respondedAt: null,
      respondedBy: null,
      responseNote: null,
    }),
  )
}

/** Records a staff-entered client response or re-sends an updated deliverable. */
export async function respondToDeliverable(deps: WorkDeps, input: unknown): Promise<WorkResult<DeliverableRecord>> {
  const parsed = respondToDeliverableSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('Deliverable response is invalid.', parsed.error.issues))
  const value = parsed.data
  const deliverable = await deps.repo.getDeliverable(asId(value.deliverableId))
  if (deliverable === undefined) return notFound('Deliverable')
  const project = await editableProject(deps, deliverable.projectId)
  if (project === undefined) return notFound('Deliverable')
  const status = value.status
  if (!isLegalDeliverableResponse(deliverable.status, status))
    return forbidden('That client response does not match the current deliverable status.')
  const now = deps.clock.now()
  const patch: Parameters<WorkDeps['repo']['updateDeliverable']>[1] =
    status === 'sent_to_client'
      ? { status, sentAt: now, respondedAt: null, respondedBy: null, responseNote: null }
      : { status, respondedAt: now, respondedBy: deps.actor.id, responseNote: nullableText(value.responseNote) }
  const saved = await persistDeliverableResponse({
    deps,
    projectId: project.id,
    deliverable,
    patch,
    expectedUpdatedAt: value.expectedUpdatedAt,
    status,
    occurredAt: now,
  })
  return saved === undefined ? conflict() : ok(saved)
}
