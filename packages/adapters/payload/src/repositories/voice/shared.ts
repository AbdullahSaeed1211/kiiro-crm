import { createLocalReq, type CollectionSlug, type PayloadRequest, type TypedUser, type Where } from 'payload'
import { isManagerUp } from '@ops/platform'
import type { VoiceCall, VoiceNumber, VoiceOperation } from '@ops/module-crm'
import { resolveActor } from '../../access/actor'
import { COLLECTIONS } from '../../contracts/names'
import { findAsUser } from '../local-api'
import { fieldOf, textOf, type Doc } from '../documents'
import { documentId, stamp, valueOf } from './codec'
import { voiceCas, voiceInsert } from './sql'

export const COLLECTION = {
  settings: COLLECTIONS.voiceSettings,
  numbers: COLLECTIONS.voiceNumbers,
  calls: COLLECTIONS.voiceCalls,
  devices: COLLECTIONS.voiceDevices,
  events: COLLECTIONS.voiceEvents,
  operations: COLLECTIONS.voiceOperations,
  callLegs: COLLECTIONS.voiceCallLegs,
} as const
export const SETTINGS_ID = '00000000-0000-4000-8000-000000000001'

interface VoicePayloadWrites {
  update(options: Readonly<Record<string, unknown>>): Promise<Doc>
}

const looseWrites = (payload: object): VoicePayloadWrites => payload as VoicePayloadWrites

export async function findOne(req: PayloadRequest, collection: CollectionSlug, where: Where): Promise<Doc | undefined> {
  const page = await req.payload.find({
    collection,
    where,
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return page.docs[0]
}

export async function write(
  req: PayloadRequest,
  collection: CollectionSlug,
  data: Readonly<Record<string, unknown>>,
): Promise<Doc> {
  const id = data['id']
  if (typeof id !== 'string') throw new Error(`Voice inserts require an explicit id for ${collection}`)
  const insertion = await voiceInsert(req.payload, collection, data)
  if (Object.keys(insertion.related).length > 0) {
    await looseWrites(req.payload).update({
      collection,
      id,
      data: insertion.related,
      depth: 0,
      overrideAccess: true,
      req,
    })
  }
  const saved = await findOne(req, collection, { id: { equals: id } })
  if (saved === undefined) throw new Error(`Voice insert did not persist ${collection}/${id}`)
  return saved
}

export function updateVoiceDoc(
  input: Readonly<{ req: PayloadRequest; collection: CollectionSlug; id: string; data: object }>,
): Promise<Doc> {
  const { req, collection, id, data } = input
  return looseWrites(req.payload).update({ collection, id, data, depth: 0, overrideAccess: true, req })
}

export async function updateValue<T extends { updatedAt: number }>(
  input: Readonly<{
    req: PayloadRequest
    collection: CollectionSlug
    doc: Doc
    patch: Partial<T>
    expected?: { states?: readonly string[]; updatedAt?: number }
  }>,
): Promise<T | undefined> {
  const { req, collection, doc, patch, expected } = input
  const current = valueOf<T>(doc)
  if (!matchesExpected(current, expected)) return undefined
  const next = { ...current, ...patch, updatedAt: stamp(Date.now(), current.updatedAt) }
  const { where, values } = casWriteData({
    collection,
    current,
    next,
    patch,
  })
  if (!(await voiceCas(req.payload, { collection, id: documentId(doc), where, values }))) return undefined
  await writeAssignedUsers({ req, collection, doc, patch, next })
  const saved = await findOne(req, collection, { id: { equals: documentId(doc) } })
  return saved === undefined ? undefined : valueOf<T>(saved)
}

function matchesExpected(
  current: Readonly<{ updatedAt: number }> & object,
  expected: { states?: readonly string[]; updatedAt?: number } | undefined,
): boolean {
  if (expected?.states !== undefined && !expected.states.includes(String(Reflect.get(current, 'state')))) return false
  return expected?.updatedAt === undefined || current.updatedAt === expected.updatedAt
}

function casWriteData(
  input: Readonly<{
    collection: CollectionSlug
    current: Readonly<{ updatedAt: number }> & object
    next: Readonly<{ updatedAt: number }> & object
    patch: object
  }>,
): Readonly<{ where: Record<string, unknown>; values: Record<string, unknown> }> {
  const { collection, current, next, patch } = input
  const where: Record<string, unknown> = { voiceUpdatedAt: current.updatedAt }
  const oldState = fieldOf(current, 'state')
  if (typeof oldState === 'string') where['state'] = oldState
  const values: Record<string, unknown> = {
    value: next,
    voiceUpdatedAt: next.updatedAt,
    updatedAt: new Date().toISOString(),
  }
  const state = fieldOf(next, 'state')
  const providerCallId = fieldOf(next, 'providerCallId')
  if (typeof state === 'string') values['state'] = state
  if (typeof providerCallId === 'string' || providerCallId === null) values['providerCallId'] = providerCallId
  if (collection === COLLECTION.calls) {
    setCallColumns(values, next, patch)
    values['recoveryError'] = fieldOf(next, 'error')
  }
  return { where, values }
}

function setCallColumns<T extends object>(values: Record<string, unknown>, next: T, patch: Partial<T>): void {
  if ('userId' in patch) values['user'] = fieldOf(next, 'userId')
  if ('numberId' in patch) values['number'] = fieldOf(next, 'numberId')
}

async function writeAssignedUsers(
  input: Readonly<{
    req: PayloadRequest
    collection: CollectionSlug
    doc: Doc
    patch: object
    next: object
  }>,
): Promise<void> {
  const { req, collection, doc, patch, next } = input
  if (collection !== COLLECTION.calls || !('assignedUserIds' in patch)) return
  const assignedUserIds = fieldOf(next, 'assignedUserIds')
  if (!Array.isArray(assignedUserIds)) return
  const assignedUsers = assignedUserIds.filter((userId): userId is string => typeof userId === 'string')
  await updateVoiceDoc({ req, collection, id: documentId(doc), data: { assignedUsers } })
}

export async function activeUser(req: PayloadRequest, userId: string): Promise<Doc | undefined> {
  const user = await findOne(req, COLLECTIONS.users, { id: { equals: userId } })
  return user !== undefined && fieldOf(user, 'active') === true ? user : undefined
}

function operationPriority(status: VoiceOperation['status']): number {
  switch (status) {
    case 'complete':
      return 3
    case 'failed':
      return 2
    case 'uncertain':
      return 1
    case 'pending':
      return 0
  }
}

export async function updateOperation(
  req: PayloadRequest,
  id: string,
  patch: Partial<VoiceOperation>,
): Promise<VoiceOperation | undefined> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const doc = await findOne(req, COLLECTION.operations, { id: { equals: id } })
    if (doc === undefined) return undefined
    const current = valueOf<VoiceOperation>(doc)
    const updatedAt = textOf(doc, 'updatedAt')
    if (updatedAt === undefined) throw new Error('Voice operation has no storage version')
    const proposed = patch.status ?? current.status
    if (operationPriority(proposed) < operationPriority(current.status)) return current
    const next = { ...current, ...patch, updatedAt: stamp(Date.now(), current.updatedAt) }
    const storageUpdatedAt = new Date(Math.max(Date.now(), Date.parse(updatedAt) + 1)).toISOString()
    const saved = await voiceCas(req.payload, {
      collection: COLLECTION.operations,
      id,
      where: { updatedAt },
      values: { key: `${next.userId}:${next.key}`, status: next.status, value: next, updatedAt: storageUpdatedAt },
    })
    if (saved) return next
  }
  return undefined
}

export async function canReadLead(req: PayloadRequest, userId: string, leadId: string): Promise<boolean> {
  if (userId.length === 0) return false
  const user = await activeUser(req, userId)
  if (user === undefined) return false
  const actorReq = await createLocalReq({ user: user as TypedUser }, req.payload)
  const docs = await findAsUser(actorReq, {
    collection: COLLECTIONS.leads,
    where: { id: { equals: leadId } },
    limit: 1,
  })
  return docs.length === 1
}

export async function visibleCall(
  req: PayloadRequest,
  call: VoiceCall,
  systemMode: boolean,
): Promise<VoiceCall | undefined> {
  if (!(await canSeeCall(req, call, systemMode))) return undefined
  if (systemMode || call.leadId === null) return call
  const actor = await resolveActor(req)
  if (actor !== undefined && (await canReadLead(req, String(actor.id), call.leadId))) return call
  return { ...call, leadId: null, recordingId: null, recordingFileId: null, recordingState: 'off' }
}

async function canSeeCall(req: PayloadRequest, call: VoiceCall, systemMode: boolean): Promise<boolean> {
  if (systemMode) return true
  const actor = await resolveActor(req)
  if (!actor?.active) return false
  const userId = String(actor.id)
  if (isManagerUp(actor) || call.userId === userId || call.assignedUserIds.includes(userId)) return true
  return inboundLineAssigned(req, call, userId)
}

async function inboundLineAssigned(req: PayloadRequest, call: VoiceCall, userId: string): Promise<boolean> {
  if (call.direction !== 'inbound') return false
  const number = await findOne(req, COLLECTION.numbers, { id: { equals: call.numberId } })
  return number !== undefined && valueOf<VoiceNumber>(number).assigneeIds.includes(userId)
}

export function listedName(doc: Doc): { id: string; name: string } | undefined {
  const id = textOf(doc, 'id')
  const name = textOf(doc, 'name')
  return id === undefined || name === undefined || name.length === 0 ? undefined : { id, name }
}
