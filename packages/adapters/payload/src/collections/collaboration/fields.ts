import type { CollectionConfig, Field, Where } from 'payload'
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

export const activeUserAccess = {
  read: ({ req }: { req: { user?: object | null } }) => req.user !== null && req.user !== undefined,
  create: ({ req }: { req: { user?: object | null } }) => req.user !== null && req.user !== undefined,
  update: ({ req }: { req: { user?: object | null } }) => req.user !== null && req.user !== undefined,
  delete: () => false,
} as const

/** Shared persistence defaults for leaf collections; the lead adds these to the central registration. */
export function collaborationCollection(
  definition: Pick<CollectionConfig, 'slug' | 'admin' | 'fields' | 'indexes' | 'upload'>,
): CollectionConfig {
  return {
    ...definition,
    access: activeUserAccess,
    timestamps: true,
    versions: false,
  }
}

export function parentReferenceWhere(recordType: string, recordId: string): Where {
  return { and: [{ recordType: { equals: recordType } }, { recordId: { equals: recordId } }] }
}

export { ATTACHMENT_MIME_TYPES }
