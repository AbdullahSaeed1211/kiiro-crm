import type { PayloadRequest } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { findAsUser } from './local-api'
import { fieldOf, idOf, numberOf, textOf, type Doc } from './documents'

export interface PresenceRow {
  readonly userId: string
  readonly lastSeenAt: number
}

const rowId = (doc: Doc): string => {
  const id = textOf(doc, 'id')
  if (id === undefined) throw new Error('Presence row has no id')
  return id
}

function mapRow(doc: Doc): PresenceRow | undefined {
  const userId = idOf(fieldOf(doc, 'user'))
  const lastSeenAt = numberOf(doc, 'lastSeenAt')
  return userId !== undefined && lastSeenAt !== null ? { userId, lastSeenAt } : undefined
}

async function findUserRow(req: PayloadRequest, userId: string) {
  const docs = await findAsUser(req, {
    collection: COLLECTIONS.presence,
    where: { user: { equals: userId } },
    limit: 1,
  })
  return docs[0]
}

async function updatePresence(req: PayloadRequest, doc: Doc, lastSeenAt: number): Promise<void> {
  await req.payload.update({
    collection: COLLECTIONS.presence,
    id: rowId(doc),
    data: { lastSeenAt },
    depth: 0,
    overrideAccess: false,
    req,
  })
}

async function heartbeat(req: PayloadRequest, userId: string, lastSeenAt: number): Promise<void> {
  const doc = await findUserRow(req, userId)
  if (doc !== undefined) return updatePresence(req, doc, lastSeenAt)
  try {
    await req.payload.create({
      collection: COLLECTIONS.presence,
      data: { user: userId, lastSeenAt },
      depth: 0,
      overrideAccess: false,
      req,
    })
  } catch (error) {
    // A second tab may win the unique-user insert; update the row it created.
    const raced = await findUserRow(req, userId)
    if (raced === undefined) throw error
    await updatePresence(req, raced, lastSeenAt)
  }
}

async function clearPresence(req: PayloadRequest, userId: string): Promise<void> {
  const doc = await findUserRow(req, userId)
  if (doc !== undefined)
    await req.payload.delete({ collection: COLLECTIONS.presence, id: rowId(doc), overrideAccess: false, req })
}

async function listPresence(req: PayloadRequest, userIds: readonly string[]): Promise<readonly PresenceRow[]> {
  if (userIds.length === 0) return []
  const docs = await findAsUser(req, {
    collection: COLLECTIONS.presence,
    where: { user: { in: [...userIds] } },
    limit: userIds.length,
  })
  return docs.flatMap((doc) => {
    const row = mapRow(doc)
    return row === undefined ? [] : [row]
  })
}

export function createPresenceRepository(req: PayloadRequest) {
  return {
    heartbeat: (userId: string, lastSeenAt: number) => heartbeat(req, userId, lastSeenAt),
    clear: (userId: string) => clearPresence(req, userId),
    list: (userIds: readonly string[]) => listPresence(req, userIds),
  }
}
