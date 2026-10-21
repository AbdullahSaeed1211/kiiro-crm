import { asId, type Id } from '@ops/kernel'
import type { CrmRepository, ScheduleItemRecord } from '@ops/module-crm'
import type { PayloadRequest, Where } from 'payload'
import { COLLECTIONS } from '../../contracts/names'
import { fieldOf, idOf, idsOf, msOf, textOf, type Doc } from '../documents'
import { createAsSystem, findAsUser } from '../local-api'
import { updateAgencyItemIfUnchanged } from '../agency-write'

type ScheduleMethods = Pick<
  CrmRepository,
  | 'createScheduleItem'
  | 'getScheduleItem'
  | 'findScheduleItemBySourceKey'
  | 'findScheduleItemForRecord'
  | 'listScheduleItems'
  | 'updateScheduleItem'
>
type SchedulePatch = Parameters<CrmRepository['updateScheduleItem']>[1]

function scheduleKind(value: unknown): ScheduleItemRecord['kind'] | undefined {
  return value === 'appointment' || value === 'callback' ? value : undefined
}

function scheduleStatus(value: unknown): ScheduleItemRecord['status'] | undefined {
  return value === 'scheduled' || value === 'completed' || value === 'cancelled' ? value : undefined
}

function scheduleRecordType(value: unknown): ScheduleItemRecord['recordType'] | undefined {
  return value === 'lead' || value === 'contact' ? value : undefined
}

interface ParsedScheduleFields {
  readonly id: Id
  readonly recordId: Id
  readonly recordType: ScheduleItemRecord['recordType']
  readonly kind: ScheduleItemRecord['kind']
  readonly startsAt: number
  readonly status: ScheduleItemRecord['status']
  readonly createdAt: number
  readonly updatedAt: number
}

function parsedScheduleFields(
  value: Readonly<{
    id: Id | undefined
    recordId: Id | undefined
    recordType: ScheduleItemRecord['recordType'] | undefined
    kind: ScheduleItemRecord['kind'] | undefined
    startsAt: unknown
    status: ScheduleItemRecord['status'] | undefined
    createdAt: number | undefined
    updatedAt: number | undefined
  }>,
): ParsedScheduleFields | undefined {
  if (!hasScheduleIdentity(value) || !hasScheduleTimes(value)) return undefined
  return {
    id: value.id,
    recordId: value.recordId,
    recordType: value.recordType,
    kind: value.kind,
    startsAt: value.startsAt,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function hasScheduleIdentity(
  value: Readonly<{
    id: Id | undefined
    recordId: Id | undefined
    recordType: ScheduleItemRecord['recordType'] | undefined
    kind: ScheduleItemRecord['kind'] | undefined
    status: ScheduleItemRecord['status'] | undefined
  }>,
): value is Readonly<{
  id: Id
  recordId: Id
  recordType: ScheduleItemRecord['recordType']
  kind: ScheduleItemRecord['kind']
  status: ScheduleItemRecord['status']
}> {
  return (
    value.id !== undefined &&
    value.recordId !== undefined &&
    value.recordType !== undefined &&
    value.kind !== undefined &&
    value.status !== undefined
  )
}

function hasScheduleTimes(
  value: Readonly<{ startsAt: unknown; createdAt: number | undefined; updatedAt: number | undefined }>,
): value is Readonly<{
  startsAt: number
  createdAt: number
  updatedAt: number
}> {
  return typeof value.startsAt === 'number' && value.createdAt !== undefined && value.updatedAt !== undefined
}

function mapScheduleItem(doc: Doc): ScheduleItemRecord | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const recordId = idOf(fieldOf(doc, 'recordId'))
  const recordType = scheduleRecordType(fieldOf(doc, 'recordType'))
  const kind = scheduleKind(fieldOf(doc, 'kind'))
  const startsAt = fieldOf(doc, 'startsAt')
  const status = scheduleStatus(fieldOf(doc, 'status'))
  const createdAt = msOf(fieldOf(doc, 'createdAt'))
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  const fields = parsedScheduleFields({ id, recordId, recordType, kind, startsAt, status, createdAt, updatedAt })
  if (fields === undefined) return undefined
  return {
    id: fields.id,
    kind: fields.kind,
    recordType: fields.recordType,
    recordId: fields.recordId,
    assigneeIds: idsOf(fieldOf(doc, 'assignees')).map((value) => asId(String(value))),
    startsAt: fields.startsAt,
    status: fields.status,
    title: textOf(doc, 'title') ?? null,
    notes: textOf(doc, 'notes') ?? null,
    sourceKey: textOf(doc, 'sourceKey') ?? null,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  }
}

function scheduleData(record: Omit<ScheduleItemRecord, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    kind: record.kind,
    recordType: record.recordType,
    recordId: record.recordId,
    assignees: record.assigneeIds,
    startsAt: record.startsAt,
    status: record.status,
    title: record.title,
    notes: record.notes,
    sourceKey: record.sourceKey,
  }
}

function mapSchedulePatch(patch: SchedulePatch): Record<string, unknown> {
  const { assigneeIds, ...fields } = patch
  return { ...fields, ...(assigneeIds === undefined ? {} : { assignees: assigneeIds }) }
}

const byId = (id: Id): Where => ({ id: { equals: id } })

/** Scoped and CAS-backed persistence for CRM appointments and callbacks. */
export function scheduleItems(req: PayloadRequest): ScheduleMethods {
  return {
    createScheduleItem: createScheduleItem(req),
    getScheduleItem: getScheduleItem(req),
    findScheduleItemBySourceKey: findScheduleItemBySourceKey(req),
    findScheduleItemForRecord: findScheduleItemForRecord(req),
    listScheduleItems: listScheduleItems(req),
    updateScheduleItem: updateScheduleItem(req),
  }
}

function createScheduleItem(req: PayloadRequest): ScheduleMethods['createScheduleItem'] {
  return async (input) => {
    const doc = await createAsSystem(req, COLLECTIONS.scheduleItems, scheduleData(input))
    const mapped = mapScheduleItem(doc)
    if (mapped === undefined) throw new Error('Created schedule item is incomplete')
    return mapped
  }
}

function getScheduleItem(req: PayloadRequest): ScheduleMethods['getScheduleItem'] {
  return async (id) => {
    const [doc] = await findAsUser(req, { collection: COLLECTIONS.scheduleItems, where: byId(id), limit: 1 })
    return doc === undefined ? undefined : mapScheduleItem(doc)
  }
}

function findScheduleItemBySourceKey(req: PayloadRequest): ScheduleMethods['findScheduleItemBySourceKey'] {
  return async (sourceKey) => {
    const [doc] = await findAsUser(req, {
      collection: COLLECTIONS.scheduleItems,
      where: { sourceKey: { equals: sourceKey } },
      limit: 1,
    })
    return doc === undefined ? undefined : mapScheduleItem(doc)
  }
}

function findScheduleItemForRecord(req: PayloadRequest): ScheduleMethods['findScheduleItemForRecord'] {
  return async (input) => {
    const [doc] = await findAsUser(req, {
      collection: COLLECTIONS.scheduleItems,
      where: {
        and: [
          { kind: { equals: input.kind } },
          { recordType: { equals: input.recordType } },
          { recordId: { equals: input.recordId } },
        ],
      },
      sort: ['-updatedAt', 'id'],
      limit: 1,
    })
    return doc === undefined ? undefined : mapScheduleItem(doc)
  }
}

function listScheduleItems(req: PayloadRequest): ScheduleMethods['listScheduleItems'] {
  return async (input) => {
    const clauses: Where[] = [
      { startsAt: { greater_than_equal: input.from } },
      { startsAt: { less_than_equal: input.to } },
      { status: { equals: 'scheduled' } },
    ]
    if (input.assigneeId !== undefined) clauses.push({ assignees: { contains: input.assigneeId } })
    if (input.recordType !== undefined) clauses.push({ recordType: { equals: input.recordType } })
    const docs = await findAsUser(req, {
      collection: COLLECTIONS.scheduleItems,
      where: { and: clauses },
      sort: ['startsAt', 'id'],
    })
    return docs.flatMap((doc) => mapScheduleItem(doc) ?? [])
  }
}

function updateScheduleItem(req: PayloadRequest): ScheduleMethods['updateScheduleItem'] {
  return async (id, patch, expectedUpdatedAt) => {
    const doc = await updateAgencyItemIfUnchanged(req, {
      collection: COLLECTIONS.scheduleItems,
      id,
      expectedUpdatedAt,
      data: mapSchedulePatch(patch),
    })
    return doc === undefined ? undefined : mapScheduleItem(doc)
  }
}
