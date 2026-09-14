import type { Id } from '@ops/kernel'
import type { PayloadRequest } from 'payload'
import { resolveActor } from '../access/actor'
import { COLLECTIONS } from '../contracts/names'
import { canReadParentReference } from '../collections/collaboration/fields'
import { createNotificationStore } from '../repositories/notification-store'
import { fanOutMentions, parseMentions } from './mentions'

export interface CreateCommentInput {
  readonly recordType: string
  readonly recordId: string
  readonly body: string
}

export function validateCommentBody(body: string): string | undefined {
  if (body.trim() === '') return 'Comment body is required.'
  if (body.length > 10_000) return 'Comment body must be 10,000 characters or fewer.'
  return undefined
}

async function fanOutCreatedComment({
  req,
  input,
  comment,
  actorId,
  mentions,
}: {
  req: PayloadRequest
  input: CreateCommentInput
  comment: object
  actorId: Id
  mentions: readonly Id[]
}) {
  const commentId = String(Reflect.get(comment, 'id')) as Id
  return fanOutMentions(
    { commentId, recordType: input.recordType, recordId: input.recordId as Id, authorId: actorId, mentions, actorId },
    {
      notifications: createNotificationStore(req.payload),
      isActiveUser: async (id) => {
        try {
          const user = await req.payload.findByID({
            collection: COLLECTIONS.users,
            id,
            depth: 0,
            overrideAccess: true,
            req,
          })
          return Reflect.get(user, 'active') === true
        } catch {
          return false
        }
      },
    },
  )
}

/** The single comment write boundary: active actor, parent scope, body, mentions and notification fan-out. */
export async function createComment(req: PayloadRequest, input: CreateCommentInput) {
  const actor = await resolveActor(req)
  if (actor?.active !== true) throw new Error('An active user is required.')
  const bodyError = validateCommentBody(input.body)
  if (bodyError !== undefined) throw new Error(bodyError)
  if (!(await canReadParentReference(req, { recordType: input.recordType, recordId: input.recordId })))
    throw new Error('The referenced record is not available.')

  const mentions = parseMentions(input.body)
  const comment = await req.payload.create({
    collection: 'comments',
    data: {
      recordType: input.recordType,
      recordId: input.recordId,
      author: actor.id,
      body: input.body,
      mentions,
    },
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  const mentionedUserIds = await fanOutCreatedComment({ req, input, comment, actorId: actor.id, mentions })
  return { comment, mentionedUserIds }
}
