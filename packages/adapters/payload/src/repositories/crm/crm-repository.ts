import type {
  CallLogRecord,
  CrmDrafts,
  CrmRecords,
  CrmRepository,
  CrmRecordType,
  LookupKind,
  LookupRecord,
} from '@ops/module-crm'
import type { PayloadRequest, Sort, Where } from 'payload'
import { domainError, err, ok, type Result } from '@ops/kernel'
import type { Id } from '@ops/kernel'
import { workProfileAllows, type Workflow } from '@ops/platform'
import { COLLECTIONS } from '../../contracts/names'
import { fieldOf, idOf, textOf, type Doc } from '../documents'
import { createAsSystem, findAsUser, pageAsUser, updateAndMap } from '../local-api'
import { loadFieldDefinitions } from '../field-definitions'
import { archiveAccess } from './archive-store'
import { createAsUser } from './local-writes'
import { CRM_COLLECTIONS, toCrmData, toCrmRecord } from './record-codecs'
import { createCrmStageStore, firstWorkflow, whereId } from './stage-store'
import { scheduleItems } from './schedule-store'
import { toActor } from '../../access/actor'

type RecordAccess = Pick<CrmRepository, 'get' | 'list' | 'create' | 'update' | 'archive' | 'listArchived' | 'restore'>

type Directory = Pick<
  CrmRepository,
  'findContactByEmail' | 'loadDefaultWorkflow' | 'listLookups' | 'loadFieldDefinitions'
>

type Calls = Pick<CrmRepository, 'createCallLog' | 'listCallLogs' | 'listRecentCallLogs' | 'isActiveUser'>

async function activeUserCanReadRecord(req: PayloadRequest, id: Id, recordType?: 'lead' | 'contact'): Promise<boolean> {
  const docs = await findAsUser(req, {
    collection: COLLECTIONS.users,
    where: { and: [{ id: { equals: id } }, { active: { equals: true } }] },
    limit: 1,
  })
  const actor = docs[0] === undefined ? undefined : toActor(docs[0])
  return actor !== undefined && (recordType === undefined || workProfileAllows(actor, { type: recordType }))
}

interface CallLogFields {
  readonly id: ReturnType<typeof idOf>
  readonly recordId: ReturnType<typeof idOf>
  readonly callerId: ReturnType<typeof idOf>
  readonly occurredAt: unknown
  readonly recordType: unknown
  readonly outcome: unknown
  readonly createdAt: number
  readonly updatedAt: number
}

function isCallLogFields(value: CallLogFields): value is CallLogFields & {
  readonly id: NonNullable<CallLogFields['id']>
  readonly recordId: NonNullable<CallLogFields['recordId']>
  readonly callerId: NonNullable<CallLogFields['callerId']>
  readonly occurredAt: number
  readonly recordType: 'lead' | 'contact'
  readonly outcome: CallLogRecord['outcome']
} {
  const idsPresent = [value.id, value.recordId, value.callerId].every((field) => field !== undefined)
  const timesValid =
    typeof value.occurredAt === 'number' && Number.isFinite(value.createdAt) && Number.isFinite(value.updatedAt)
  const recordValid = value.recordType === 'lead' || value.recordType === 'contact'
  const outcomeValid = ['answered', 'no_answer', 'voicemail', 'follow_up'].includes(String(value.outcome))
  return idsPresent && timesValid && recordValid && outcomeValid
}

function callLogFields(doc: Doc): CallLogFields {
  return {
    id: idOf(fieldOf(doc, 'id')),
    recordId: idOf(fieldOf(doc, 'recordId')),
    callerId: idOf(fieldOf(doc, 'caller')),
    occurredAt: fieldOf(doc, 'occurredAt'),
    createdAt: Date.parse(String(fieldOf(doc, 'createdAt'))),
    updatedAt: Date.parse(String(fieldOf(doc, 'updatedAt'))),
    recordType: fieldOf(doc, 'recordType'),
    outcome: fieldOf(doc, 'outcome'),
  }
}

function mapCallLog(doc: Doc): CallLogRecord | undefined {
  const fields = callLogFields(doc)
  if (!isCallLogFields(fields)) return undefined
  return {
    id: fields.id,
    recordType: fields.recordType,
    recordId: fields.recordId,
    callerId: fields.callerId,
    occurredAt: fields.occurredAt,
    outcome: fields.outcome,
    notes: textOf(doc, 'notes') ?? null,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  }
}

function calls(req: PayloadRequest): Calls {
  return {
    createCallLog: async (input) => {
      const doc = await createAsSystem(req, COLLECTIONS.callLogs, {
        recordType: input.recordType,
        recordId: input.recordId,
        caller: input.callerId,
        occurredAt: input.occurredAt,
        outcome: input.outcome,
        notes: input.notes,
      })
      const mapped = mapCallLog(doc)
      if (mapped === undefined) throw new Error('Created call log is incomplete')
      return mapped
    },
    listCallLogs: async (recordType, recordId) => {
      const docs = await findAsUser(req, {
        collection: COLLECTIONS.callLogs,
        where: { recordType: { equals: recordType }, recordId: { equals: recordId } },
        sort: '-occurredAt',
      })
      return docs.flatMap((doc) => mapCallLog(doc) ?? [])
    },
    listRecentCallLogs: async (callerId, limit) => {
      const docs = await findAsUser(req, {
        collection: COLLECTIONS.callLogs,
        where: { caller: { equals: callerId } },
        sort: '-occurredAt',
        limit: Math.min(50, Math.max(1, limit)),
      })
      return docs.flatMap((doc) => mapCallLog(doc) ?? [])
    },
    isActiveUser: (id, recordType) => activeUserCanReadRecord(req, id, recordType),
  }
}

export interface CrmPageQuery<T extends CrmRecordType = CrmRecordType> {
  readonly type: T
  readonly where: Where
  readonly page: number
  readonly limit: number
  readonly sort?: Sort
}

export interface CrmPageResult<T extends CrmRecordType = CrmRecordType> {
  readonly records: readonly CrmRecords[T][]
  readonly total: number
}

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
  return updateAndMap(req, {
    collection: CRM_COLLECTIONS[type],
    id,
    expectedUpdatedAt,
    data: toCrmData(type, patch),
    mapper: (doc) => Promise.resolve(toCrmRecord(type, doc)),
  })
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
    create: async (type, draft): Promise<Result<CrmRecords[typeof type]>> => {
      const collection = CRM_COLLECTIONS[type]
      const doc = await createAsUser(req, collection, toCrmData(type, draft))
      const record = toCrmRecord(type, doc)
      if (record === undefined)
        return err(domainError('INTERNAL', `${collection} create returned an incomplete document`))
      return ok(record)
    },
    update: (...args) => updateRecord(req, { type: args[0], id: args[1], patch: args[2], expectedUpdatedAt: args[3] }),
    ...archiveAccess(req),
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
    loadDefaultWorkflow: async (recordType): Promise<Result<Workflow>> => {
      const workflow = await firstWorkflow(req, { recordType: { equals: recordType } })
      if (workflow === undefined) return err(domainError('UNAVAILABLE', `No ${recordType} workflow is configured`))
      return ok(workflow)
    },
    listLookups: async (kind) => {
      const docs = await findAsUser(req, { collection: LOOKUP_COLLECTIONS[kind], where: {}, sort: 'name' })
      return docs.flatMap(toLookup).toSorted((a, b) => byName.compare(a.name, b.name))
    },
    loadFieldDefinitions: (type) => loadFieldDefinitions(req, type),
  }
}

/** `CrmRepository` on the Payload Local API: reads, creates and compare-and-set updates apply the request user's access. */
export function createCrmRepository(req: PayloadRequest): CrmRepository {
  return { ...createCrmStageStore(req), ...recordAccess(req), ...directory(req), ...calls(req), ...scheduleItems(req) }
}

/** Reads one permission-scoped CRM page without materializing the entire collection. */
export async function listCrmPage<T extends CrmRecordType>(
  req: PayloadRequest,
  query: CrmPageQuery<T>,
): Promise<CrmPageResult<T>> {
  return pageAsUser(
    req,
    {
      collection: CRM_COLLECTIONS[query.type],
      where: query.where,
      sort: query.sort ?? ['-createdAt', 'id'],
      page: query.page,
      limit: query.limit,
    },
    (doc) => toCrmRecord(query.type, doc),
  )
}
