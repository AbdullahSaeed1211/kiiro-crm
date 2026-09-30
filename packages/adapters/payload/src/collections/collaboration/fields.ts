import type { Access, CollectionConfig, CollectionSlug, Field, PayloadRequest, Where } from 'payload'
import { isManagerUp } from '@ops/platform'
import { COLLECTIONS, FIELDS, RECORD_TYPES } from '../../contracts/names'
import { allow, anyActive, managerUp, ownedBy, systemOnly } from '../../access/rules'
import { resolveActor } from '../../access/actor'
import { ATTACHMENT_MIME_TYPES, RECORD_TYPE_VALUES } from '../values'

/** Collection names introduced by the collaboration and product-service vertical. */
export const COLLABORATION_COLLECTIONS = {
  comments: 'comments',
  attachments: 'attachments',
  notifications: 'notifications',
  notificationPrefs: 'notificationPrefs',
  savedViews: 'savedViews',
  layouts: 'layouts',
} as const

export type CollaborationCollectionSlug = (typeof COLLABORATION_COLLECTIONS)[keyof typeof COLLABORATION_COLLECTIONS]

export const RECORD_REFERENCE_FIELDS = [
  { name: 'recordType', type: 'select', options: [...RECORD_TYPE_VALUES], required: true },
  { name: 'recordId', type: 'text', required: true },
] as const satisfies readonly Field[]

const noAccess: Access = () => false

// Leaf collections are registered after the lead refreshes generated Payload types.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- generated collection union intentionally lags this leaf
const payloadCollection = (slug: string): CollectionSlug => slug as unknown as CollectionSlug

function valueOf(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : value
}

function idOf(value: unknown): string | undefined {
  const id = valueOf(value, 'id')
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
}

function referenceOf(value: unknown): { recordType: string; recordId: string } | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const recordType = valueOf(value, 'recordType')
  const recordId = valueOf(value, 'recordId')
  return typeof recordType === 'string' && typeof recordId === 'string' && recordType !== '' && recordId !== ''
    ? { recordType, recordId }
    : undefined
}

const scopedParents = Object.entries(RECORD_TYPES) as readonly [keyof typeof RECORD_TYPES, string][]

function parentSlug(recordType: string): string | undefined {
  const entry = scopedParents.find(([, value]) => value === recordType)
  if (entry === undefined) return undefined
  return entry[0] === 'organizations' ? COLLECTIONS.organizations : `${recordType}s`
}

/** Checks one polymorphic parent through its own scoped collection access. */
export async function canReadParentReference(
  req: PayloadRequest,
  reference: { recordType: string; recordId: string },
): Promise<boolean> {
  const actor = await resolveActor(req)
  if (actor?.active !== true) return false
  if (reference.recordType === '' || reference.recordId === '') return false
  const collection = parentSlug(reference.recordType)
  if (collection === undefined) return false
  try {
    await req.payload.findByID({
      collection: payloadCollection(collection),
      id: reference.recordId,
      depth: 0,
      overrideAccess: isManagerUp(actor),
      user: req.user,
      req,
    })
    return true
  } catch {
    return false
  }
}

async function activeActor(req: PayloadRequest) {
  const actor = await resolveActor(req)
  return actor?.active === true ? actor : undefined
}

async function document(
  req: PayloadRequest,
  collection: string,
  id: string | number | undefined,
): Promise<object | undefined> {
  if (id === undefined) return undefined
  try {
    return await req.payload.findByID({
      collection: payloadCollection(collection),
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })
  } catch {
    return undefined
  }
}

async function parentAllowed(req: PayloadRequest, doc: unknown): Promise<boolean> {
  const reference = referenceOf(doc)
  return reference !== undefined && (await canReadParentReference(req, reference))
}

function authorId(doc: object): string | undefined {
  return idOf(Reflect.get(doc, 'author'))
}

function uploaderId(doc: object): string | undefined {
  return idOf(Reflect.get(doc, 'uploadedBy'))
}

/**
 * Any active user may query comments and attachments; `filterToReadableParents` then drops the ones whose parent record
 * the user cannot read. Enumerating the readable parents into the query instead would bind two variables per record,
 * which D1 caps at 100 per statement.
 */
export const parentScopedRead: Access = async ({ req }) => (await activeActor(req)) !== undefined
export const parentScopedCreate: Access = async ({ req, data }) => {
  if (!(await activeActor(req))) return false
  return parentAllowed(req, data)
}

export const commentUpdate: Access = async ({ req, id }) => {
  const actor = await activeActor(req)
  const doc = await document(req, COLLABORATION_COLLECTIONS.comments, id)
  if (actor === undefined || doc === undefined || !(await parentAllowed(req, doc))) return false
  const createdAt = valueOf(doc, 'createdAt')
  return (
    authorId(doc) === String(actor.id) &&
    typeof createdAt === 'string' &&
    Date.now() - Date.parse(createdAt) <= 24 * 60 * 60 * 1000
  )
}

export const commentDelete: Access = async ({ req, id }) => {
  const actor = await activeActor(req)
  const doc = await document(req, COLLABORATION_COLLECTIONS.comments, id)
  if (actor === undefined || doc === undefined || !(await parentAllowed(req, doc))) return false
  return isManagerUp(actor) || authorId(doc) === String(actor.id)
}

export const attachmentDelete: Access = async ({ req, id }) => {
  const actor = await activeActor(req)
  const doc = await document(req, COLLABORATION_COLLECTIONS.attachments, id)
  if (actor === undefined || doc === undefined || !(await parentAllowed(req, doc))) return false
  return isManagerUp(actor) || uploaderId(doc) === String(actor.id)
}

export const notificationAccess = {
  read: ownedBy(FIELDS.user),
  create: systemOnly,
  update: ownedBy(FIELDS.user),
  delete: noAccess,
} as const

export const notificationPreferenceAccess = {
  read: ownedBy(FIELDS.user),
  create: systemOnly,
  update: ownedBy(FIELDS.user),
  delete: noAccess,
} as const

const savedViewCreate: Access = async ({ req, data }) => {
  const actor = await activeActor(req)
  if (actor === undefined || typeof data !== 'object' || data === null) return false
  const owner = idOf(valueOf(data, 'owner'))
  return owner === undefined ? isManagerUp(actor) : owner === String(actor.id)
}

const savedViewMutation: Access = async ({ req, id }) => {
  const actor = await activeActor(req)
  const view = await document(req, COLLABORATION_COLLECTIONS.savedViews, id)
  if (actor === undefined || view === undefined) return false
  const owner = idOf(valueOf(view, 'owner'))
  return owner === undefined ? isManagerUp(actor) : owner === String(actor.id)
}

export const savedViewAccess = {
  read: allow((actor) => ({
    or: [{ owner: { equals: null } }, { owner: { exists: false } }, { owner: { equals: actor.id } }],
  })),
  create: savedViewCreate,
  update: savedViewMutation,
  delete: savedViewMutation,
} as const

export const layoutAccess = { read: anyActive, create: managerUp, update: managerUp, delete: managerUp } as const

/** Shared persistence defaults for leaf collections; the lead adds these to the central registration. */
export function collaborationCollection(
  definition: Pick<CollectionConfig, 'slug' | 'admin' | 'fields' | 'indexes' | 'upload'> &
    Partial<Pick<CollectionConfig, 'access' | 'hooks'>>,
): CollectionConfig {
  return {
    ...definition,
    access: definition.access ?? { read: noAccess, create: noAccess, update: noAccess, delete: noAccess },
    timestamps: true,
    versions: false,
  }
}

export function parentReferenceWhere(recordType: string, recordId: string): Where {
  return { and: [{ recordType: { equals: recordType } }, { recordId: { equals: recordId } }] }
}

export { ATTACHMENT_MIME_TYPES }
