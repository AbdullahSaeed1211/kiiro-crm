import { asId, err, invalidInput, ok, type Id } from '@ops/kernel'
import type { ContentItemRecord, WorkDeps, WorkResult } from '../ports/work'
import { createContentItemSchema, updateContentItemSchema } from '../schema'
import {
  activeProjectStaff,
  conflict,
  editableProject,
  FIELD_CHANGED,
  forbidden,
  INVALID_PROJECT_MEMBER,
  INVALID_SCHEDULE,
  notFound,
  nullableText,
  PROJECT_RECORD,
  responsibleOwner,
  validContentSchedule,
} from './agency-work-support'

interface ContentPatchInput {
  readonly title?: string | undefined
  readonly body?: string | null | undefined
  readonly channel?: string | null | undefined
  readonly publishAt?: number | null | undefined
  readonly status?: ContentItemRecord['status'] | undefined
  readonly ownerId?: string | undefined
}

type ContentPatch = Partial<Omit<ContentItemRecord, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
type PreparedContentPatch =
  { readonly kind: 'ready'; readonly patch: ContentPatch } | { readonly kind: 'owner' } | { readonly kind: 'schedule' }

async function persistContentItem(deps: WorkDeps, input: Omit<ContentItemRecord, 'id' | 'createdAt' | 'updatedAt'>) {
  return deps.uow.run(async () => {
    const record = await deps.repo.createContentItem(input)
    await deps.repo.addActivity({
      record: { type: PROJECT_RECORD, id: record.projectId },
      verb: FIELD_CHANGED,
      actorId: deps.actor.id,
      occurredAt: deps.clock.now(),
      data: { field: 'content', contentItemId: record.id, title: record.title, status: record.status },
    })
    return record
  })
}

async function prepareContentPatch(input: {
  readonly deps: WorkDeps
  readonly item: ContentItemRecord
  readonly value: ContentPatchInput
  readonly project: { readonly ownerId: Id | null; readonly memberIds: readonly Id[] }
}): Promise<PreparedContentPatch> {
  const { deps, item, value, project } = input
  const ownerId = value.ownerId === undefined ? undefined : asId(value.ownerId)
  if (ownerId !== undefined && !(await activeProjectStaff(deps, project, ownerId))) return { kind: 'owner' }
  const effective = { ...item, ...value }
  if (!validContentSchedule(effective.status, effective.publishAt, nullableText(effective.channel)))
    return { kind: 'schedule' }
  const patch = Object.fromEntries(
    Object.entries(value).filter(([key, fieldValue]) => key !== 'ownerId' && fieldValue !== undefined),
  ) as ContentPatch
  if (ownerId !== undefined) Object.assign(patch, { ownerId })
  return { kind: 'ready', patch }
}

async function persistContentUpdate(input: {
  readonly deps: WorkDeps
  readonly projectId: Id
  readonly item: ContentItemRecord
  readonly patch: ContentPatch
  readonly expectedUpdatedAt: number
}) {
  const { deps, projectId, item, patch, expectedUpdatedAt } = input
  return deps.uow.run(async () => {
    const updated = await deps.repo.updateContentItem(item.id, patch, expectedUpdatedAt)
    if (updated === undefined) return undefined
    if (patch.status !== undefined || patch.channel !== undefined || patch.publishAt !== undefined) {
      await deps.repo.addActivity({
        record: { type: PROJECT_RECORD, id: projectId },
        verb: FIELD_CHANGED,
        actorId: deps.actor.id,
        occurredAt: deps.clock.now(),
        data: { field: 'content.status', contentItemId: updated.id, title: updated.title, status: updated.status },
      })
    }
    return updated
  })
}

/** Creates a rough draft or scheduled content item for a visible project. */
export async function createContentItem(deps: WorkDeps, input: unknown): Promise<WorkResult<ContentItemRecord>> {
  const parsed = createContentItemSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('Content details are invalid.', parsed.error.issues))
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
  const status = value.status ?? 'draft'
  const publishAt = value.publishAt ?? null
  const channel = nullableText(value.channel)
  if (!validContentSchedule(status, publishAt, channel)) return err(invalidInput(INVALID_SCHEDULE, []))
  const saved = await persistContentItem(deps, {
    projectId: project.id,
    title: value.title,
    body: nullableText(value.body),
    channel,
    publishAt,
    status,
    ownerId: owner.value,
  })
  return ok(saved)
}

/** Updates content only when its current project and schedule remain valid. */
export async function updateContentItem(deps: WorkDeps, input: unknown): Promise<WorkResult<ContentItemRecord>> {
  const parsed = updateContentItemSchema.safeParse(input)
  if (!parsed.success) return err(invalidInput('Content changes are invalid.', parsed.error.issues))
  const value = parsed.data
  const item = await deps.repo.getContentItem(asId(value.contentItemId))
  if (item === undefined) return notFound('Content item')
  const project = await editableProject(deps, item.projectId)
  if (project === undefined) return notFound('Content item')
  const prepared = await prepareContentPatch({ deps, item, value: value.patch, project })
  if (prepared.kind === 'owner') return forbidden(INVALID_PROJECT_MEMBER)
  if (prepared.kind === 'schedule') return err(invalidInput(INVALID_SCHEDULE, []))
  const saved = await persistContentUpdate({
    deps,
    projectId: project.id,
    item,
    patch: prepared.patch,
    expectedUpdatedAt: value.expectedUpdatedAt,
  })
  return saved === undefined ? conflict() : ok(saved)
}

/** Lists content in the requested month and includes unbooked drafts for the chosen project. */
export async function listContentItems(
  deps: WorkDeps,
  input: { readonly from: number; readonly to: number; readonly projectId?: string },
): Promise<WorkResult<readonly ContentItemRecord[]>> {
  if (!Number.isFinite(input.from) || !Number.isFinite(input.to) || input.from > input.to)
    return err(invalidInput('Choose a valid date range.', []))
  return ok(
    await deps.repo.listContentItems({
      from: input.from,
      to: input.to,
      ...(input.projectId === undefined ? {} : { projectId: asId(input.projectId) }),
    }),
  )
}
