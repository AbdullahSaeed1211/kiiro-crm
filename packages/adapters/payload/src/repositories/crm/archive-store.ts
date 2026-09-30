import type { CrmRepository, CrmRecordType } from '@ops/module-crm'
import type { PayloadRequest } from 'payload'
import { writeIfUnchanged } from '../conditional-write'
import { fieldOf, idOf, textOf, type Doc } from '../documents'
import { findAsUser } from '../local-api'
import { CRM_COLLECTIONS } from './record-codecs'

function labelOf(type: CrmRecordType, doc: Doc): string {
  if (type === 'organization') return textOf(doc, 'name') ?? ''
  if (type === 'contact') return [textOf(doc, 'firstName'), textOf(doc, 'lastName')].filter(Boolean).join(' ')
  return textOf(doc, 'title') ?? ''
}

const timeOf = (doc: Doc, key: string): number => Date.parse(textOf(doc, key) ?? '') || 0

/** Archiving is Payload's trash: a `deletedAt` time hides a document from every read until it is cleared again. */
export function archiveAccess(req: PayloadRequest): Pick<CrmRepository, 'archive' | 'listArchived' | 'restore'> {
  // Trashed documents cannot be read back, so both writes are guarded SQL updates instead of Payload updates.
  const setDeletedAt = (input: { type: CrmRecordType; id: string; expectedUpdatedAt: number; value: string | null }) =>
    writeIfUnchanged(req.payload, {
      collection: CRM_COLLECTIONS[input.type],
      id: input.id,
      expectedUpdatedAt: new Date(input.expectedUpdatedAt).toISOString(),
      updatedAt: new Date(Math.max(Date.now(), input.expectedUpdatedAt + 1)).toISOString(),
      data: { deletedAt: input.value },
    })
  return {
    archive: (type, id, expectedUpdatedAt) =>
      setDeletedAt({ type, id, expectedUpdatedAt, value: new Date().toISOString() }),
    restore: (type, id, expectedUpdatedAt) => setDeletedAt({ type, id, expectedUpdatedAt, value: null }),
    listArchived: async (type) => {
      const docs = await findAsUser(req, {
        collection: CRM_COLLECTIONS[type],
        where: { deletedAt: { exists: true } },
        sort: '-deletedAt',
        trash: true,
      })
      return docs.flatMap((doc) => {
        const id = idOf(fieldOf(doc, 'id'))
        const archivedAt = timeOf(doc, 'deletedAt')
        return id === undefined
          ? []
          : [{ type, id, label: labelOf(type, doc), archivedAt, updatedAt: timeOf(doc, 'updatedAt') }]
      })
    },
  }
}
