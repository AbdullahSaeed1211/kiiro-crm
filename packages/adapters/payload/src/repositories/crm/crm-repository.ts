import type { CrmDrafts, CrmRepository, CrmRecordType, LookupKind, LookupRecord } from '@ops/module-crm'
import type { PayloadRequest } from 'payload'
import { COLLECTIONS } from '../../contracts/names'
import { fieldOf, idOf, textOf, type Doc } from '../documents'
import { findAsUser, updateIfUnchanged } from '../local-api'
import { createAsUser } from './local-writes'
import { CRM_COLLECTIONS, toCrmData, toCrmRecord } from './record-codecs'
import { createCrmStageStore, firstWorkflow, whereId } from './stage-store'

type RecordAccess = Pick<CrmRepository, 'get' | 'list' | 'create' | 'update'>

type Directory = Pick<CrmRepository, 'findContactByEmail' | 'loadDefaultWorkflow' | 'listLookups'>

interface UpdateArgs<T extends CrmRecordType = CrmRecordType> {
  readonly type: T
  readonly id: Parameters<CrmRepository['get']>[1]
  readonly patch: Partial<CrmDrafts[T]>
  readonly expectedUpdatedAt: number
}

const LOOKUP_COLLECTIONS = {
  source: COLLECTIONS.sources,
  lostReason: COLLECTIONS.lostReasons,
} as const satisfies Record<LookupKind, string>

// SQL orders names by byte value, so the in-memory sort gives the case-insensitive order people expect.
const byName = new Intl.Collator('en', { sensitivity: 'base' })

async function updateRecord<T extends CrmRecordType>(req: PayloadRequest, args: UpdateArgs<T>) {
  const { type, id, patch, expectedUpdatedAt } = args
  const update = { collection: CRM_COLLECTIONS[type], id, expectedUpdatedAt, data: toCrmData(type, patch) }
  const doc = await updateIfUnchanged(req, update)
  return doc && toCrmRecord(type, doc)
}

function toLookup(doc: Doc): LookupRecord[] {
  const id = idOf(fieldOf(doc, 'id'))
  return id === undefined ? [] : [{ id, name: textOf(doc, 'name') ?? '' }]
}

function recordAccess(req: PayloadRequest): RecordAccess {
  return {
    get: async (type, id) => {
      const [doc] = await findAsUser(req, { collection: CRM_COLLECTIONS[type], where: whereId(id), limit: 1 })
      return doc && toCrmRecord(type, doc)
    },
    list: async (type) => {
      const docs = await findAsUser(req, { collection: CRM_COLLECTIONS[type], where: {}, sort: ['-createdAt', 'id'] })
      return docs.flatMap((doc) => toCrmRecord(type, doc) ?? [])
    },
    create: async (type, draft) => {
      const collection = CRM_COLLECTIONS[type]
      const record = toCrmRecord(type, await createAsUser(req, collection, toCrmData(type, draft)))
      if (record === undefined) throw new Error(`${collection} create returned an incomplete document`)
      return record
    },
    update: (...args) => updateRecord(req, { type: args[0], id: args[1], patch: args[2], expectedUpdatedAt: args[3] }),
  }
}

function directory(req: PayloadRequest): Directory {
  return {
    findContactByEmail: async (email) => {
      // Contacts store email lower-cased, so an exact match on the lower-cased input is case-insensitive.
      const where = { email: { equals: email.trim().toLowerCase() } }
      if (where.email.equals === '') return undefined
      const [doc] = await findAsUser(req, { collection: COLLECTIONS.contacts, where, sort: 'createdAt', limit: 1 })
      return doc && toCrmRecord('contact', doc)
    },
    loadDefaultWorkflow: async (recordType) => {
      const workflow = await firstWorkflow(req, { recordType: { equals: recordType } })
      if (workflow === undefined) throw new Error(`No ${recordType} workflow is configured`)
      return workflow
    },
    listLookups: async (kind) => {
      const docs = await findAsUser(req, { collection: LOOKUP_COLLECTIONS[kind], where: {}, sort: 'name' })
      return docs.flatMap(toLookup).toSorted((a, b) => byName.compare(a.name, b.name))
    },
  }
}

/** `CrmRepository` on the Payload Local API: reads, creates and compare-and-set updates apply the request user's access. */
export function createCrmRepository(req: PayloadRequest): CrmRepository {
  return { ...createCrmStageStore(req), ...recordAccess(req), ...directory(req) }
}
