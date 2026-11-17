import type { PayloadRequest } from 'payload'
import type { VoiceRepository, VoiceSettings, VoiceNumber } from '@ops/module-crm'
import { COLLECTION, SETTINGS_ID, activeUser, canReadLead, findOne, listedName, updateVoiceDoc, write } from './shared'
import { valueOf, documentId, uniqueIndex } from './codec'
import { findAsUser } from '../local-api'
import { fieldOf, type Doc } from '../documents'
import { resolveActor } from '../../access/actor'
import { isManagerUp } from '@ops/platform'
import { COLLECTIONS } from '../../contracts/names'

export function createVoiceRecordsRepository(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  return { ...settingsMethods(req), ...numberMethods(req, systemMode), ...leadAndMemberMethods(req) }
}

function settingsMethods(req: PayloadRequest): Partial<VoiceRepository> {
  return {
    loadSettings: async () => {
      const doc = await findOne(req, COLLECTION.settings, { id: { equals: SETTINGS_ID } })
      return doc === undefined
        ? {
            enabled: false,
            recordingEnabled: false,
            maxCallSeconds: 900,
            maxConcurrentCalls: 1,
            ringSeconds: 25,
            fallback: 'voicemail',
            forwardingNumber: null,
          }
        : valueOf<VoiceSettings>(doc)
    },
    saveSettings: async (settings) => {
      const current = await findOne(req, COLLECTION.settings, { id: { equals: SETTINGS_ID } })
      if (current !== undefined) {
        await updateVoiceDoc({
          req,
          collection: COLLECTION.settings,
          id: documentId(current),
          data: { value: settings },
        })
        return
      }
      try {
        await write(req, COLLECTION.settings, { id: SETTINGS_ID, value: settings })
      } catch (error) {
        if (!uniqueIndex(error)) throw error
        const raced = await findOne(req, COLLECTION.settings, { id: { equals: SETTINGS_ID } })
        if (raced === undefined) throw error
        await updateVoiceDoc({ req, collection: COLLECTION.settings, id: SETTINGS_ID, data: { value: settings } })
      }
    },
  }
}

function numberMethods(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  const { payload } = req
  return {
    listNumbers: async () => {
      if (systemMode) {
        const docs = await payload.find({
          collection: COLLECTION.numbers,
          where: {},
          limit: 250,
          pagination: false,
          depth: 0,
          overrideAccess: true,
          req,
        })
        return docs.docs.map((doc) => valueOf<VoiceNumber>(doc as Doc))
      }
      const docs = await findAsUser(req, { collection: COLLECTION.numbers, where: {}, limit: 250 })
      return docs.map((doc) => valueOf<VoiceNumber>(doc))
    },
    getNumber: async (id) => {
      let doc: Doc | undefined
      if (systemMode) doc = await findOne(req, COLLECTION.numbers, { id: { equals: id } })
      else doc = (await findAsUser(req, { collection: COLLECTION.numbers, where: { id: { equals: id } }, limit: 1 }))[0]
      return doc === undefined ? undefined : valueOf<VoiceNumber>(doc)
    },
    saveNumber: async (number) => {
      const current = await findOne(req, COLLECTION.numbers, { id: { equals: number.id } })
      const data = { e164: number.e164, assignees: [...number.assigneeIds], status: number.status, value: number }
      if (current === undefined) await write(req, COLLECTION.numbers, { id: number.id, ...data })
      else await updateVoiceDoc({ req, collection: COLLECTION.numbers, id: number.id, data })
    },
  }
}

function leadAndMemberMethods(req: PayloadRequest): Partial<VoiceRepository> {
  const { payload } = req
  return {
    canReadLead: (userId, leadId) => canReadLead(req, userId, leadId),
    isActiveUser: async (userId) => (await activeUser(req, userId)) !== undefined,
    listActiveMembers: async () => {
      const actor = await resolveActor(req)
      if (!actor?.active) return []
      const docs = await payload.find({
        collection: COLLECTIONS.users,
        where: isManagerUp(actor) ? {} : { id: { equals: actor.id } },
        limit: 250,
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const members = docs.docs.flatMap((doc) => {
        const row = doc as Doc
        const member = fieldOf(row, 'active') === true ? listedName(row) : undefined
        return member === undefined ? [] : [member]
      })
      return members
    },
  }
}
