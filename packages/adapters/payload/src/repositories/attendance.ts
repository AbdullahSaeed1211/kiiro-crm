import type { AttendanceRecord, AttendanceRepository } from '@ops/module-work'
import type { PayloadRequest, Where } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, msOf, numberOf, textOf, type Doc } from './documents'
import { createAsSystem, findAsUser } from './local-api'
import { writeIfUnchanged } from './conditional-write'

function mapped(doc: Doc): AttendanceRecord {
  const user = fieldOf(doc, 'user')
  return {
    id: String(fieldOf(doc, 'id')),
    userId: String(user),
    reportedCheckInAt: numberOf(doc, 'reportedCheckInAt') ?? 0,
    submittedAt: numberOf(doc, 'submittedAt') ?? 0,
    reportedCheckOutAt: numberOf(doc, 'reportedCheckOutAt'),
    checkOutSubmittedAt: numberOf(doc, 'checkOutSubmittedAt'),
    note: textOf(doc, 'note') ?? '',
    checkOutNote: textOf(doc, 'checkOutNote') ?? '',
  }
}

function attendanceReads(req: PayloadRequest) {
  const collection = COLLECTIONS.attendance
  const find = (where: Where, limit = 1) => findAsUser(req, { collection, where, sort: '-submittedAt', limit })
  const get = async (id: string) => {
    const [doc] = await find({ id: { equals: id } })
    return doc
  }
  const open = async (userId: string) => {
    const [doc] = await find({ openKey: { equals: userId } })
    return doc === undefined ? undefined : mapped(doc)
  }
  return { find, get, open }
}

async function closeAttendance(req: PayloadRequest, input: Parameters<AttendanceRepository['close']>[0]) {
  const { get } = attendanceReads(req)
  const doc = await get(input.id)
  if (doc === undefined || textOf(doc, 'openKey') !== input.userId || String(fieldOf(doc, 'user')) !== input.userId)
    return undefined
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  if (updatedAt === undefined) return undefined
  const written = await writeIfUnchanged(req.payload, {
    collection: COLLECTIONS.attendance,
    id: input.id,
    expectedUpdatedAt: new Date(updatedAt).toISOString(),
    updatedAt: new Date(Math.max(input.submittedAt, updatedAt + 1)).toISOString(),
    data: {
      openKey: null,
      reportedCheckOutAt: input.reportedAt,
      checkOutSubmittedAt: input.submittedAt,
      checkOutNote: input.note,
    },
  })
  const saved = written ? await get(input.id) : undefined
  return saved === undefined ? undefined : mapped(saved)
}

/** User-scoped reads plus command-authorized writes; a unique openKey also guards simultaneous check-ins. */
export function createAttendanceRepository(req: PayloadRequest): AttendanceRepository {
  const { find, get, open } = attendanceReads(req)
  return {
    open,
    latest: async (userId) => {
      const [doc] = await find({ user: { equals: userId } })
      return doc === undefined ? undefined : mapped(doc)
    },
    get: async (id) => {
      const doc = await get(id)
      return doc === undefined ? undefined : mapped(doc)
    },
    list: async (userId) => (await find(userId === undefined ? {} : { user: { equals: userId } }, 100)).map(mapped),
    create: async ({ userId, ...input }) => {
      try {
        return mapped(await createAsSystem(req, COLLECTIONS.attendance, { ...input, user: userId, openKey: userId }))
      } catch (error) {
        if (await open(userId)) return undefined
        throw error
      }
    },
    close: (input) => closeAttendance(req, input),
  }
}
