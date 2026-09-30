import type { CollectionSlug } from 'payload'
import { getRequestContext } from '@/server/container'

/** Payload stores timestamps as ISO strings; the UI works in epoch milliseconds. */
function toEpochMs(value: unknown): number {
  const ms = typeof value === 'number' ? value : Date.parse(String(value))
  return Number.isFinite(ms) ? ms : 0
}

export interface RecordNote {
  readonly id: string
  readonly body: string
  readonly createdAt: number
  readonly authorName: string | null
  readonly canDelete: boolean
}

function canUserDeleteNote(
  actor: { active?: boolean; id?: unknown; role?: string } | null,
  authorId: unknown,
): boolean {
  if (!actor?.active) return false
  if (String(authorId) === String(actor.id)) return true
  return actor.role === 'manager' || actor.role === 'owner'
}

function extractAuthorInfo(author: unknown): { id: unknown; name: string | null } {
  if (typeof author !== 'object' || author === null) {
    return { id: null, name: null }
  }
  const authorRecord = author as Record<string, unknown>
  return {
    id: authorRecord.id ?? null,
    name: typeof authorRecord.name === 'string' ? authorRecord.name : null,
  }
}

/** Loads notes (comments) for a record, newest first, with delete permission info. */
export async function loadRecordNotes(recordType: string, recordId: string): Promise<RecordNote[]> {
  const { payload, req, actor } = await getRequestContext()

  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- leaf collection is not in generated types yet
      collection: 'comments' as unknown as CollectionSlug,
      where: {
        and: [
          { recordType: { equals: recordType } },
          { recordId: { equals: recordId } },
          { deletedAt: { exists: false } },
        ],
      },
      sort: '-createdAt',
      limit: 1000,
      depth: 1,
      overrideAccess: false,
      req,
    })

    return result.docs.map((doc) => {
      const docAny = doc as unknown
      const docRecord = docAny as Record<string, unknown>
      const { id: authorId, name: authorName } = extractAuthorInfo(docRecord.author)
      const bodyValue = docRecord.body
      const bodyStr = typeof bodyValue === 'string' ? bodyValue : ''
      const docId = docRecord.id
      const docIdStr = typeof docId === 'string' ? docId : String(docId)

      return {
        id: docIdStr,
        body: bodyStr,
        createdAt: toEpochMs(docRecord.createdAt),
        authorName,
        canDelete: canUserDeleteNote(actor, authorId),
      }
    })
  } catch {
    return []
  }
}
