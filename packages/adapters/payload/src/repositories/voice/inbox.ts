import type { PayloadRequest } from 'payload'
import type { VoiceRepository, VoiceEvent, VoiceOperation } from '@ops/module-crm'
import { COLLECTION, findOne, updateOperation } from './shared'
import { voiceCas, voiceLeaseCas } from './sql'
import { documentId, uniqueIndex, valueOf } from './codec'
import { write } from './shared'
import { type Doc } from '../documents'

export function createVoiceInboxRepository(req: PayloadRequest): Partial<VoiceRepository> {
  return { ...operationMethods(req), ...eventMethods(req) }
}

function operationMethods(req: PayloadRequest): Partial<VoiceRepository> {
  return {
    getOperation: async (userId, key) => {
      const doc = await findOne(req, COLLECTION.operations, { key: { equals: `${userId}:${key}` } })
      return doc === undefined ? undefined : valueOf<VoiceOperation>(doc)
    },
    reserveOperation: async (operation) => {
      const key = `${operation.userId}:${operation.key}`
      try {
        await write(req, COLLECTION.operations, {
          id: operation.id,
          key,
          user: operation.userId,
          kind: operation.kind,
          status: operation.status,
          value: { ...operation, key },
        })
      } catch (error) {
        if (!uniqueIndex(error)) throw error
      }
      const doc = await findOne(req, COLLECTION.operations, { key: { equals: key } })
      if (doc === undefined) throw new Error('Could not resolve reserved voice operation')
      return valueOf<VoiceOperation>(doc)
    },
    updateOperation: (id, patch) => updateOperation(req, id, patch),
  }
}

function eventMethods(req: PayloadRequest): Partial<VoiceRepository> {
  return { ...eventInsertMethods(req), ...eventLeaseMethods(req), ...eventFinishMethods(req) }
}

function eventInsertMethods(req: PayloadRequest): Partial<VoiceRepository> {
  return {
    enqueueEvent: async (event) => {
      try {
        await write(req, COLLECTION.events, {
          id: event.id,
          eventKey: event.eventKey,
          status: event.status,
          leaseUntil: event.leaseUntil,
          receivedAt: event.receivedAt,
          value: event,
        })
        return true
      } catch (error) {
        if (uniqueIndex(error)) {
          const existing = await findOne(req, COLLECTION.events, { eventKey: { equals: event.eventKey } })
          if (existing !== undefined) return false
        }
        throw error
      }
    },
  }
}

function eventLeaseMethods(req: PayloadRequest): Partial<VoiceRepository> {
  const { payload } = req
  return {
    leaseEvents: async (now, leaseUntil, limit) => {
      const docs = await payload.find({
        collection: COLLECTION.events,
        where: {
          or: [
            { status: { equals: 'pending' } },
            { and: [{ status: { equals: 'processing' } }, { leaseUntil: { less_than_equal: now } }] },
          ],
        },
        sort: 'receivedAt',
        limit: Math.min(250, Math.max(1, limit)),
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const claimed: VoiceEvent[] = []
      for (const raw of docs.docs) {
        const doc = raw as Doc
        const current = valueOf<VoiceEvent>(doc)
        const leased = { ...current, status: 'processing' as const, leaseUntil, attempts: current.attempts + 1 }
        if (await voiceLeaseCas({ payload, id: documentId(doc), now, leaseUntil, value: leased })) claimed.push(leased)
      }
      return claimed
    },
  }
}

function eventFinishMethods(req: PayloadRequest): Partial<VoiceRepository> {
  const { payload } = req
  return {
    finishEvent: async (id, leaseUntil, result) => {
      const doc = await findOne(req, COLLECTION.events, { id: { equals: id } })
      if (doc === undefined) return
      const current = valueOf<VoiceEvent>(doc)
      if (current.status !== 'processing' || current.leaseUntil !== leaseUntil) return
      const next: VoiceEvent = { ...current, status: result.status, error: result.error ?? null, leaseUntil: null }
      await voiceCas(payload, {
        collection: COLLECTION.events,
        id,
        where: { status: 'processing', leaseUntil },
        values: { status: next.status, leaseUntil: null, value: next, updatedAt: new Date().toISOString() },
      })
    },
  }
}
