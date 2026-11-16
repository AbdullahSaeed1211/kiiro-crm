import { COLLECTIONS, FIELDS } from '../contracts/names'
import {
  ADMIN_GROUPS,
  customDataField,
  epochMs,
  lostFields,
  ownershipFields,
  personFields,
  relationshipTo,
  spikeCollection,
  stageFields,
  textField,
  titleField,
} from './fields'
import { assignNewLead } from '../hooks/lead-assignment'
import type { CollectionBeforeChangeHook } from 'payload'

interface LeadCreatorDoc {
  readonly id: string
  readonly createdBy?: unknown
}

function relationshipId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value !== 'object' || value === null) return undefined
  const id: unknown = Reflect.get(value, 'id')
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
}

const stampLeadCreator: CollectionBeforeChangeHook<LeadCreatorDoc> = ({ data, operation, originalDoc, req }) => {
  const input = data as unknown as Record<string, unknown>
  const currentActorId = relationshipId(Reflect.get(req, 'user'))
  const originalCreator = relationshipId(Reflect.get(originalDoc ?? {}, 'createdBy'))
  if (operation === 'create' && currentActorId !== undefined) return { ...input, createdBy: currentActorId }
  if (operation === 'update') return { ...input, createdBy: originalCreator ?? null }
  return input
}

/** Lead records (spec §10.1); `createdAt` is indexed by the timestamps Payload adds. */
export const leadsCollection = spikeCollection({
  trash: true,
  slug: COLLECTIONS.leads,
  admin: {
    group: ADMIN_GROUPS.records,
    useAsTitle: 'title',
    defaultColumns: ['title', 'email', 'stageId', FIELDS.owner, 'source'],
  },
  hooks: {
    beforeChange: [assignNewLead, stampLeadCreator],
  },
  fields: [
    titleField(),
    ...personFields(),
    textField('companyName', { maxLength: 200 }),
    relationshipTo('organization', COLLECTIONS.organizations),
    relationshipTo('source', COLLECTIONS.sources, { index: true }),
    ...ownershipFields(),
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { hidden: true },
    },
    ...stageFields(),
    ...lostFields(),
    epochMs('nextActionAt', { index: true }),
    epochMs('convertedAt', { index: true }),
    relationshipTo('convertedDeal', COLLECTIONS.deals),
    {
      name: 'intakeSubmissionId',
      type: 'text',
      unique: true,
      admin: { hidden: true },
      access: { create: () => false, read: () => false, update: () => false },
    },
    customDataField(),
  ],
})
