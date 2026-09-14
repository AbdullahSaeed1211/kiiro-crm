import { COLLECTIONS } from '../../contracts/names'
import { resolveActor } from '../../access/actor'
import type { PayloadRequest } from 'payload'
import {
  collaborationCollection,
  commentDelete,
  commentUpdate,
  parentScopedCreate,
  parentScopedRead,
  RECORD_REFERENCE_FIELDS,
} from './fields'
import { parseMentions } from '../../collaboration/mentions'
import { ADMIN_GROUPS } from '../fields'

function relationId(value: unknown): string | undefined {
  const id = typeof value === 'object' && value !== null ? (value as Record<string, unknown>)['id'] : value
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
}

function assertBody(body: unknown): asserts body is string | undefined {
  if (body !== undefined && (typeof body !== 'string' || body.trim() === '' || body.length > 10_000))
    throw new Error('Comment body is invalid.')
}

function assertMentions(value: unknown): asserts value is string[] | undefined {
  if (value !== undefined && (!Array.isArray(value) || value.some((id) => typeof id !== 'string')))
    throw new Error('Comment mentions are invalid.')
}

function recordOf(data: unknown): Record<string, unknown> {
  if (typeof data !== 'object' || data === null) throw new Error('Comment data is invalid.')
  return data as Record<string, unknown>
}

function assertAuthor(operation: string, input: Record<string, unknown>, actorId: string): void {
  if (operation === 'create' && relationId(input['author']) !== actorId)
    throw new Error('Comments must be authored by the current user.')
}

function normalizeCommentFields({
  operation,
  input,
  originalDoc,
  body,
}: {
  operation: string
  input: Record<string, unknown>
  originalDoc?: unknown
  body?: string | undefined
}): void {
  if (operation === 'create' && body !== undefined) input['mentions'] = parseMentions(body)
  if (operation === 'update' && typeof originalDoc === 'object' && originalDoc !== null)
    input['author'] = Reflect.get(originalDoc, 'author')
}

async function validateCommentChange({
  data,
  operation,
  originalDoc,
  req,
}: {
  data: unknown
  operation: string
  originalDoc?: unknown
  req: PayloadRequest
}): Promise<Record<string, unknown>> {
  const actor = await resolveActor(req)
  if (actor?.active !== true) throw new Error('An active user is required.')
  const input = recordOf(data)
  const body = input['body']
  assertAuthor(operation, input, String(actor.id))
  assertBody(body)
  const mentions = input['mentions']
  assertMentions(mentions)
  normalizeCommentFields({ operation, input, body, ...(originalDoc === undefined ? {} : { originalDoc }) })
  return input
}

/** Comments keep markdown-lite source, normalized mention ids and soft-delete metadata together. */
export const commentsCollection = collaborationCollection({
  slug: 'comments',
  admin: { group: ADMIN_GROUPS.system, useAsTitle: 'body', defaultColumns: ['recordType', 'author', 'createdAt'] },
  fields: [
    ...RECORD_REFERENCE_FIELDS,
    { name: 'author', type: 'relationship', relationTo: COLLECTIONS.users, required: true },
    { name: 'body', type: 'textarea', required: true, maxLength: 10_000 },
    { name: 'mentions', type: 'json', defaultValue: [] },
    { name: 'editedAt', type: 'number', min: 0 },
    { name: 'deletedAt', type: 'number', min: 0 },
  ],
  indexes: [{ fields: ['recordType', 'recordId', 'createdAt'] }],
  access: { read: parentScopedRead, create: parentScopedCreate, update: commentUpdate, delete: commentDelete },
  hooks: {
    beforeChange: [validateCommentChange],
    beforeDelete: [
      () => {
        throw new Error('Comments use soft deletion.')
      },
    ],
  },
})
