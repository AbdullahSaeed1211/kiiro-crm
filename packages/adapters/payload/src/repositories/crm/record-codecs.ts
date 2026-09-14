import type { CrmDrafts, CrmRecords, CrmRecordType, PipelineFields } from '@ops/module-crm'
import type { CollectionSlug } from 'payload'
import { COLLECTIONS, type CRM_FIELDS } from '../../contracts/names'
import { fieldOf, idOf, msOf, type Doc } from '../documents'
import {
  decodeFields,
  encodeFields,
  jsonObject,
  money,
  optionalNumber,
  optionalRef,
  optionalText,
  refList,
  requiredRef,
  stageEntry,
  text,
  type Codecs,
} from './codecs'

type FieldOf<T extends keyof typeof CRM_FIELDS> = (typeof CRM_FIELDS)[T][number]

/** Collection of each CRM record type. */
export const CRM_COLLECTIONS = {
  organization: COLLECTIONS.organizations,
  contact: COLLECTIONS.contacts,
  lead: COLLECTIONS.leads,
  deal: COLLECTIONS.deals,
} as const satisfies Record<CrmRecordType, CollectionSlug>

const ownerId = optionalRef('owner')
const organizationId = optionalRef('organization')
const email = optionalText('email')
const phone = optionalText('phone')
const customData = jsonObject('customData')

const ORGANIZATION: Codecs<CrmDrafts['organization'], FieldOf<'organization'>> = {
  name: text('name'),
  website: optionalText('website'),
  phone,
  email,
  ownerId,
  sourceId: optionalRef('source'),
  customData,
}

const CONTACT: Codecs<CrmDrafts['contact'], FieldOf<'contact'>> = {
  firstName: text('firstName'),
  lastName: optionalText('lastName'),
  email,
  phone,
  organizationId,
  ownerId,
  customData,
}

const PIPELINE: Codecs<Omit<PipelineFields, 'createdAt' | 'updatedAt'>, FieldOf<'lead'> & FieldOf<'deal'>> = {
  ownerId,
  assigneeIds: refList('assignees'),
  workflowId: requiredRef('workflow'),
  stageId: requiredRef('stageId'),
  stageEnteredAt: stageEntry('stageEnteredAt'),
  lostReasonId: optionalRef('lostReason'),
  lostNote: optionalText('lostNote'),
  customData,
}

const LEAD: Codecs<CrmDrafts['lead'], FieldOf<'lead'>> = {
  ...PIPELINE,
  title: text('title'),
  firstName: optionalText('firstName'),
  lastName: optionalText('lastName'),
  email,
  phone,
  companyName: optionalText('companyName'),
  organizationId,
  sourceId: optionalRef('source'),
  convertedAt: optionalNumber('convertedAt'),
  convertedDealId: optionalRef('convertedDeal'),
}

const DEAL: Codecs<CrmDrafts['deal'], FieldOf<'deal'>> = {
  ...PIPELINE,
  title: text('title'),
  organizationId,
  contactIds: refList('contacts'),
  primaryContactId: optionalRef('primaryContact'),
  value: money('valueAmountMinor', 'valueCurrency'),
  expectedCloseAt: optionalNumber('expectedCloseAt'),
  closedAt: optionalNumber('closedAt'),
  sourceLeadId: optionalRef('sourceLead'),
}

const CODECS: { readonly [T in CrmRecordType]: Codecs<CrmDrafts[T]> } = {
  organization: ORGANIZATION,
  contact: CONTACT,
  lead: LEAD,
  deal: DEAL,
}

/** Maps a document to a record of `type`; `undefined` when it lacks its id, timestamps, workflow or stage. */
export function toCrmRecord<T extends CrmRecordType>(type: T, doc: Doc): CrmRecords[T] | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const createdAt = msOf(fieldOf(doc, 'createdAt'))
  const updatedAt = msOf(fieldOf(doc, 'updatedAt'))
  const draft = decodeFields<CrmDrafts[T]>(CODECS[type], doc)
  if (id === undefined || createdAt === undefined || updatedAt === undefined || draft === undefined) return undefined
  return { ...draft, id, createdAt, updatedAt } as CrmRecords[T]
}

/** Document data for the draft or patch fields of `type` that are set. */
export function toCrmData<T extends CrmRecordType>(type: T, values: Partial<CrmDrafts[T]>): Record<string, unknown> {
  return encodeFields<CrmDrafts[T]>(CODECS[type], values)
}
