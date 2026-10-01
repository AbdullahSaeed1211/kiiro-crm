import type { WorkRecordType, WorkRepository } from '@ops/module-work'
import type { PayloadRequest } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { writeIfUnchanged } from './conditional-write'
import { fieldOf, idOf, textOf, type Doc } from './documents'
import { findAsUser } from './local-api'

const WORK_COLLECTIONS = { task: COLLECTIONS.tasks, project: COLLECTIONS.projects } as const

const labelOf = (type: WorkRecordType, doc: Doc): string =>
  (type === 'task' ? textOf(doc, 'title') : textOf(doc, 'name')) ?? ''
const timeOf = (doc: Doc, key: string): number => Date.parse(textOf(doc, key) ?? '') || 0

/** Archiving is Payload's trash: a `deletedAt` time hides a task or project from every read until it is cleared. */
export function workArchiveAccess(req: PayloadRequest): Pick<WorkRepository, 'archive' | 'listArchived' | 'restore'> {
  // Trashed documents cannot be read back, so both writes are guarded SQL updates instead of Payload updates.
  const setDeletedAt = (input: { type: WorkRecordType; id: string; expectedUpdatedAt: number; value: string | null }) =>
    writeIfUnchanged(req.payload, {
      collection: WORK_COLLECTIONS[input.type],
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
        collection: WORK_COLLECTIONS[type],
        where: { deletedAt: { exists: true } },
        sort: '-deletedAt',
        trash: true,
      })
      return docs.flatMap((doc) => {
        const id = idOf(fieldOf(doc, 'id'))
        return id === undefined
          ? []
          : [
              {
                type,
                id,
                label: labelOf(type, doc),
                archivedAt: timeOf(doc, 'deletedAt'),
                updatedAt: timeOf(doc, 'updatedAt'),
              },
            ]
      })
    },
  }
}
