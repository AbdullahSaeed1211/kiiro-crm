import type { Id } from '@ops/kernel'
import type { ContentItemRecord, DeliverableRecord, WorkRepository } from '@ops/module-work'
import type { CollectionSlug, PayloadRequest, Where } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, msOf, numberOf, textOf, type Doc } from './documents'
import { updateAgencyItemIfUnchanged } from './agency-write'
import { createAsSystem, findAsUser } from './local-api'
import { updateProjectMonthlyDesign, updateProjectRetainer } from './project-custom-data'

// The application regenerates this union from Payload after a schema change.
const collectionNames: ReadonlySet<string> = new Set(Object.values(COLLECTIONS))

function isCollectionSlug(slug: string): slug is CollectionSlug {
  return collectionNames.has(slug)
}

function collection(slug: string): CollectionSlug {
  if (!isCollectionSlug(slug)) throw new Error('Unknown Payload collection')
  return slug
}
const byId = (id: Id): Where => ({ id: { equals: id } })

function deliverableStatus(value: unknown): DeliverableRecord['status'] | undefined {
  return value === 'draft' || value === 'sent_to_client' || value === 'approved' || value === 'changes_requested'
    ? value
    : undefined
}

type Present<T extends readonly unknown[]> = { readonly [K in keyof T]: Exclude<T[K], undefined> }

function hasValues<T extends readonly unknown[]>(values: T): values is Present<T> {
  return values.every((value) => value !== undefined)
}

function deliverableField(key: string): string {
  if (key === 'ownerId') return 'owner'
  if (key === 'attachmentId') return 'attachment'
  return key
}

function contentField(key: string): string {
  return key === 'ownerId' ? 'owner' : key
}

function mapDeliverable(doc: Doc): DeliverableRecord | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const projectId = idOf(fieldOf(doc, 'project'))
  const ownerId = idOf(fieldOf(doc, 'owner'))
  const status = deliverableStatus(textOf(doc, 'status'))
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  const required = [id, projectId, ownerId, updatedAt, status] as const
  if (!hasValues(required)) return undefined
  const [validId, validProjectId, validOwnerId, validUpdatedAt, validStatus] = required
  return {
    id: validId,
    projectId: validProjectId,
    title: textOf(doc, 'title') ?? '',
    ownerId: validOwnerId,
    status: validStatus,
    linkUrl: textOf(doc, 'linkUrl') ?? null,
    attachmentId: idOf(fieldOf(doc, 'attachment')) ?? null,
    sentAt: numberOf(doc, 'sentAt'),
    respondedAt: numberOf(doc, 'respondedAt'),
    respondedBy: idOf(fieldOf(doc, 'respondedBy')) ?? null,
    responseNote: textOf(doc, 'responseNote') ?? null,
    createdAt: msOf(fieldOf(doc, 'createdAt')) ?? validUpdatedAt,
    updatedAt: validUpdatedAt,
  }
}

function contentStatus(value: unknown): ContentItemRecord['status'] | undefined {
  return value === 'draft' || value === 'scheduled' || value === 'published' ? value : undefined
}

function mapContentItem(doc: Doc): ContentItemRecord | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const projectId = idOf(fieldOf(doc, 'project'))
  const ownerId = idOf(fieldOf(doc, 'owner'))
  const publishAt = numberOf(doc, 'publishAt')
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  const status = contentStatus(textOf(doc, 'status'))
  const required = [id, projectId, ownerId, updatedAt, status] as const
  if (!hasValues(required)) return undefined
  const [validId, validProjectId, validOwnerId, validUpdatedAt, validStatus] = required
  return {
    id: validId,
    projectId: validProjectId,
    title: textOf(doc, 'title') ?? '',
    body: textOf(doc, 'body') ?? null,
    channel: textOf(doc, 'channel') ?? null,
    publishAt,
    status: validStatus,
    ownerId: validOwnerId,
    createdAt: msOf(fieldOf(doc, 'createdAt')) ?? validUpdatedAt,
    updatedAt: validUpdatedAt,
  }
}

function deliverableData(record: Omit<DeliverableRecord, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    project: record.projectId,
    title: record.title,
    owner: record.ownerId,
    status: record.status,
    linkUrl: record.linkUrl,
    attachment: record.attachmentId,
    sentAt: record.sentAt,
    respondedAt: record.respondedAt,
    respondedBy: record.respondedBy,
    responseNote: record.responseNote,
  }
}

function contentItemData(record: Omit<ContentItemRecord, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    project: record.projectId,
    title: record.title,
    body: record.body,
    channel: record.channel,
    publishAt: record.publishAt,
    status: record.status,
    owner: record.ownerId,
  }
}

function updateData(patch: Readonly<Record<string, unknown>>, map: (key: string) => string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(patch).map(([key, value]) => [map(key), value]))
}

async function createDeliverable(req: PayloadRequest, input: Parameters<WorkRepository['createDeliverable']>[0]) {
  const doc = await createAsSystem(req, collection(COLLECTIONS.deliverables), deliverableData(input))
  const record = mapDeliverable(doc)
  if (record === undefined) throw new Error('Created deliverable is incomplete')
  return record
}

async function getDeliverable(req: PayloadRequest, id: Id) {
  const [doc] = await findAsUser(req, { collection: collection(COLLECTIONS.deliverables), where: byId(id), limit: 1 })
  return doc === undefined ? undefined : mapDeliverable(doc)
}

async function listDeliverables(req: PayloadRequest, projectId: Id) {
  const docs = await findAsUser(req, {
    collection: COLLECTIONS.deliverables,
    where: { project: { equals: projectId } },
    sort: '-createdAt',
  })
  return docs.flatMap((doc) => mapDeliverable(doc) ?? [])
}

async function updateDeliverable(
  req: PayloadRequest,
  input: {
    readonly id: Id
    readonly patch: Parameters<WorkRepository['updateDeliverable']>[1]
    readonly expectedUpdatedAt: number
  },
) {
  const { id, patch, expectedUpdatedAt } = input
  const doc = await updateAgencyItemIfUnchanged(req, {
    collection: COLLECTIONS.deliverables,
    id,
    expectedUpdatedAt,
    data: updateData(patch, deliverableField),
  })
  return doc === undefined ? undefined : mapDeliverable(doc)
}

async function createContentItem(req: PayloadRequest, input: Parameters<WorkRepository['createContentItem']>[0]) {
  const doc = await createAsSystem(req, collection(COLLECTIONS.contentItems), contentItemData(input))
  const record = mapContentItem(doc)
  if (record === undefined) throw new Error('Created content item is incomplete')
  return record
}

async function getContentItem(req: PayloadRequest, id: Id) {
  const [doc] = await findAsUser(req, { collection: collection(COLLECTIONS.contentItems), where: byId(id), limit: 1 })
  return doc === undefined ? undefined : mapContentItem(doc)
}

async function listContentItems(req: PayloadRequest, input: Parameters<WorkRepository['listContentItems']>[0]) {
  const dateRange: Where = {
    or: [
      { and: [{ publishAt: { greater_than_equal: input.from } }, { publishAt: { less_than_equal: input.to } }] },
      { publishAt: { equals: null } },
      { publishAt: { exists: false } },
    ],
  }
  const where: Where =
    input.projectId === undefined ? dateRange : { and: [{ project: { equals: input.projectId } }, dateRange] }
  const docs = await findAsUser(req, { collection: collection(COLLECTIONS.contentItems), where, sort: 'publishAt' })
  return docs.flatMap((doc) => mapContentItem(doc) ?? [])
}

async function updateContentItem(
  req: PayloadRequest,
  input: {
    readonly id: Id
    readonly patch: Parameters<WorkRepository['updateContentItem']>[1]
    readonly expectedUpdatedAt: number
  },
) {
  const { id, patch, expectedUpdatedAt } = input
  const doc = await updateAgencyItemIfUnchanged(req, {
    collection: COLLECTIONS.contentItems,
    id,
    expectedUpdatedAt,
    data: updateData(patch, contentField),
  })
  return doc === undefined ? undefined : mapContentItem(doc)
}

/** Project planning persistence; every query is evaluated with the request user's project scope. */
export function agencyWorkMethods(
  req: PayloadRequest,
): Pick<
  WorkRepository,
  | 'createDeliverable'
  | 'getDeliverable'
  | 'listDeliverables'
  | 'updateDeliverable'
  | 'createContentItem'
  | 'getContentItem'
  | 'listContentItems'
  | 'updateContentItem'
  | 'updateProjectRetainer'
  | 'updateProjectMonthlyDesign'
> {
  return {
    createDeliverable: (input) => createDeliverable(req, input),
    getDeliverable: (id) => getDeliverable(req, id),
    listDeliverables: (projectId) => listDeliverables(req, projectId),
    updateDeliverable: (id, patch, expectedUpdatedAt) => updateDeliverable(req, { id, patch, expectedUpdatedAt }),
    createContentItem: (input) => createContentItem(req, input),
    getContentItem: (id) => getContentItem(req, id),
    listContentItems: (input) => listContentItems(req, input),
    updateContentItem: (id, patch, expectedUpdatedAt) => updateContentItem(req, { id, patch, expectedUpdatedAt }),
    updateProjectRetainer: (id, retainer, expectedUpdatedAt) =>
      updateProjectRetainer(req, { id, retainer, expectedUpdatedAt }),
    updateProjectMonthlyDesign: (id, config, expectedUpdatedAt) =>
      updateProjectMonthlyDesign(req, { id, config, expectedUpdatedAt }),
  }
}
