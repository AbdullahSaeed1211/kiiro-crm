import type { PayloadRequest, Where } from 'payload'
import type { VoiceCall, VoiceCallLeg, VoiceRepository } from '@ops/module-crm'
import { COLLECTION, findOne, updateValue, updateVoiceDoc, visibleCall, write } from './shared'
import { claimVoiceCall, reserveVoiceCall } from './sql'
import { stamp, uniqueIndex, valueOf } from './codec'
import { followUp } from './missed-follow-up'
import type { Doc } from '../documents'

async function listCalls(
  input: Readonly<{ req: PayloadRequest; systemMode: boolean; where: Where; limit: number; sort?: string }>,
): Promise<VoiceCall[]> {
  const { req, systemMode, where, limit, sort } = input
  const docs = await req.payload.find({
    collection: COLLECTION.calls,
    where,
    ...(sort === undefined ? {} : { sort }),
    limit: Math.min(250, Math.max(1, limit)),
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const calls = await Promise.all(docs.docs.map((doc) => visibleCall(req, valueOf<VoiceCall>(doc as Doc), systemMode)))
  return calls.flatMap((call) => (call === undefined ? [] : [call]))
}

async function reserveLeg(req: PayloadRequest, leg: VoiceCallLeg): Promise<VoiceCallLeg> {
  const legKey = JSON.stringify([leg.callId, leg.deviceId, leg.kind])
  try {
    await write(req, COLLECTION.callLegs, {
      id: leg.id,
      legKey,
      call: leg.callId,
      deviceId: leg.deviceId,
      kind: leg.kind,
      state: leg.state,
      providerCallId: leg.providerCallId,
      voiceUpdatedAt: leg.updatedAt,
      value: leg,
    })
  } catch (error) {
    if (!uniqueIndex(error)) throw error
  }
  const doc = await findOne(req, COLLECTION.callLegs, { legKey: { equals: legKey } })
  if (doc === undefined) throw new Error('Could not resolve reserved call leg')
  return valueOf<VoiceCallLeg>(doc)
}

function callListMethods(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  return {
    listCallsForUser: (userId, manageAll, limit) =>
      listCalls({
        req,
        systemMode,
        where: manageAll
          ? {}
          : {
              or: [
                { user: { equals: userId } },
                { assignedUsers: { contains: userId } },
                { and: [{ direction: { equals: 'inbound' } }, { 'number.assignees': { contains: userId } }] },
              ],
            },
        limit,
      }),
    listOpenCalls: (limit) =>
      listCalls({
        req,
        systemMode,
        where: {
          or: [
            { state: { in: ['authorizing', 'ringing', 'connecting', 'active'] } },
            { and: [{ state: { equals: 'ended' } }, { recoveryError: { equals: 'cleanup_pending' } }] },
            {
              and: [
                { state: { equals: 'missed' } },
                { recoveryError: { in: ['fallback_pending', 'fallback_active'] } },
              ],
            },
          ],
        },
        limit,
        sort: 'voiceUpdatedAt',
      }),
  }
}

function callLookupMethods(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  return {
    getCall: async (id) => {
      const doc = await findOne(req, COLLECTION.calls, { id: { equals: id } })
      return doc === undefined ? undefined : visibleCall(req, valueOf<VoiceCall>(doc), systemMode)
    },
    findCallByRequestKey: async (userId, key) => {
      const doc = await findOne(req, COLLECTION.calls, { requestKey: { equals: `${userId}:${key}` } })
      return doc === undefined ? undefined : visibleCall(req, valueOf<VoiceCall>(doc), systemMode)
    },
    findCallByProviderId: async (providerCallId) => {
      const doc = await findOne(req, COLLECTION.calls, { providerCallId: { equals: providerCallId } })
      return doc === undefined ? undefined : visibleCall(req, valueOf<VoiceCall>(doc), systemMode)
    },
  }
}

function reservationMethods(req: PayloadRequest): Partial<VoiceRepository> {
  const { payload } = req
  return {
    reserveCall: async (call, maxConcurrentCalls) => {
      const requestKey = `${call.userId ?? 'inbound'}:${call.requestKey}`
      const result = await reserveVoiceCall(payload, {
        id: call.id,
        requestKey,
        direction: call.direction,
        state: call.state,
        numberId: call.numberId,
        userId: call.userId,
        providerCallId: call.providerCallId,
        updatedAt: call.updatedAt,
        value: call,
        maxConcurrentCalls,
      })
      if (result === 'limit') return undefined
      const doc = await findOne(req, COLLECTION.calls, { requestKey: { equals: requestKey } })
      if (doc === undefined) throw new Error('Could not resolve reserved voice call')
      if (result === 'inserted' && call.assignedUserIds.length > 0)
        await updateVoiceDoc({
          req,
          collection: COLLECTION.calls,
          id: call.id,
          data: { assignedUsers: [...call.assignedUserIds] },
        })
      return valueOf<VoiceCall>(doc)
    },
  }
}

function updateCallMethods(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  return {
    updateCall: async (id, patch, expected) => {
      const doc = await findOne(req, COLLECTION.calls, { id: { equals: id } })
      if (doc === undefined) return undefined
      const saved = await updateValue<VoiceCall>({
        req,
        collection: COLLECTION.calls,
        doc,
        patch,
        ...(expected === undefined ? {} : { expected }),
      })
      return saved === undefined ? undefined : visibleCall(req, saved, systemMode)
    },
    createMissedCallFollowUp: (call) => followUp(req, call),
  }
}

function inboundCallMethods(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  const { payload } = req
  return {
    claimInboundCall: async (id, userId, options) => {
      const doc = await findOne(req, COLLECTION.calls, { id: { equals: id } })
      if (doc === undefined) return undefined
      const call = valueOf<VoiceCall>(doc)
      if (call.direction !== 'inbound' || call.state !== 'ringing' || call.userId !== null) return undefined
      const updatedAt = stamp(Date.now(), call.updatedAt)
      const claimed: VoiceCall = {
        ...call,
        userId,
        assignedUserIds: [userId],
        answeredAt: options.answeredAt,
        state: 'connecting',
        updatedAt,
      }
      const success = await claimVoiceCall(payload, {
        id,
        userId,
        expectedUpdatedAt: call.updatedAt,
        updatedAt,
        value: claimed,
        maxConcurrentCalls: options.maxConcurrentCalls,
      })
      if (!success) return undefined
      await updateVoiceDoc({ req, collection: COLLECTION.calls, id, data: { assignedUsers: [userId] } })
      return visibleCall(req, claimed, systemMode)
    },
  }
}

function callLegMethods(req: PayloadRequest): Partial<VoiceRepository> {
  const { payload } = req
  return {
    reserveCallLeg: (leg) => reserveLeg(req, leg),
    getCallLeg: async (callId, deviceId, kind) => {
      const key = JSON.stringify([callId, deviceId, kind])
      const doc = await findOne(req, COLLECTION.callLegs, { legKey: { equals: key } })
      return doc === undefined ? undefined : valueOf<VoiceCallLeg>(doc)
    },
    findCallLegByProviderId: async (providerCallId) => {
      const doc = await findOne(req, COLLECTION.callLegs, { providerCallId: { equals: providerCallId } })
      return doc === undefined ? undefined : valueOf<VoiceCallLeg>(doc)
    },
    listCallLegs: async (callId) => {
      const docs = await payload.find({
        collection: COLLECTION.callLegs,
        where: { call: { equals: callId } },
        limit: 50,
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      return docs.docs.map((doc) => valueOf<VoiceCallLeg>(doc as Doc))
    },
    updateCallLeg: async (id, patch, expectedStates) => {
      const doc = await findOne(req, COLLECTION.callLegs, { id: { equals: id } })
      if (doc === undefined) return undefined
      return updateValue<VoiceCallLeg>({
        req,
        collection: COLLECTION.callLegs,
        doc,
        patch,
        ...(expectedStates === undefined ? {} : { expected: { states: expectedStates } }),
      })
    },
  }
}

export function createVoiceCallsRepository(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  return {
    ...callListMethods(req, systemMode),
    ...callLookupMethods(req, systemMode),
    ...reservationMethods(req),
    ...updateCallMethods(req, systemMode),
    ...inboundCallMethods(req, systemMode),
    ...callLegMethods(req),
  }
}
