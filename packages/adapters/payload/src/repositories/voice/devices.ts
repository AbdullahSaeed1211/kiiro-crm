import type { PayloadRequest } from 'payload'
import type { VoiceRepository, VoiceDevice } from '@ops/module-crm'
import { COLLECTION, findOne, updateVoiceDoc, write } from './shared'
import { documentId, valueOf } from './codec'
import { type Doc } from '../documents'
import { resolveActor } from '../../access/actor'
import { isManagerUp } from '@ops/platform'

export function createVoiceDevicesRepository(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  return { ...deviceReadMethods(req, systemMode), ...deviceWriteMethods(req), ...deviceListMethods(req) }
}

function deviceReadMethods(req: PayloadRequest, systemMode: boolean): Partial<VoiceRepository> {
  return {
    getDevice: async (userId, deviceId) => {
      if (!systemMode) {
        const actor = await resolveActor(req)
        if (actor === undefined || !actor.active || (!isManagerUp(actor) && String(actor.id) !== userId))
          return undefined
      }
      const doc = await findOne(req, COLLECTION.devices, { user: { equals: userId }, deviceId: { equals: deviceId } })
      return doc === undefined ? undefined : valueOf<VoiceDevice>(doc)
    },
    findDeviceByKey: async (key) => {
      const doc = await findOne(req, COLLECTION.devices, { key: { equals: key } })
      if (doc === undefined) return undefined
      const device = valueOf<VoiceDevice>(doc)
      if (!systemMode) {
        const actor = await resolveActor(req)
        if (actor === undefined || !actor.active || (!isManagerUp(actor) && String(actor.id) !== device.userId))
          return undefined
      }
      return device
    },
  }
}

function deviceWriteMethods(req: PayloadRequest): Partial<VoiceRepository> {
  return {
    saveDevice: async (device) => {
      const current = await findOne(req, COLLECTION.devices, { key: { equals: device.key } })
      const data = {
        key: device.key,
        user: device.userId,
        deviceId: device.deviceId,
        expiresAt: device.expiresAt,
        value: device,
      }
      if (current === undefined) await write(req, COLLECTION.devices, { id: device.id, ...data })
      else {
        const existing = valueOf<VoiceDevice>(current)
        if (existing.userId !== device.userId) throw new Error('Device credential key already belongs to another user')
        await updateVoiceDoc({ req, collection: COLLECTION.devices, id: documentId(current), data })
      }
    },
  }
}

function deviceListMethods(req: PayloadRequest): Partial<VoiceRepository> {
  const { payload } = req
  return {
    listDevices: async (userIds) => {
      const actor = await resolveActor(req)
      if (!actor?.active) return []
      const scope = isManagerUp(actor) ? [...userIds] : userIds.filter((id) => id === actor.id)
      if (userIds.length > 0 && scope.length === 0) return []
      const docs = await payload.find({
        collection: COLLECTION.devices,
        where: scope.length === 0 ? {} : { user: { in: scope } },
        limit: 250,
        pagination: false,
        depth: 0,
        overrideAccess: true,
        req,
      })
      return docs.docs.map((doc) => valueOf<VoiceDevice>(doc as Doc))
    },
  }
}
