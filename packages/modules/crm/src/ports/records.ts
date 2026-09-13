import type { Id, Money } from '@ops/kernel'

/** CRM record types (spec §10.1). */
export type CrmRecordType = 'organization' | 'contact' | 'lead' | 'deal'

/** Tenant-defined values stored against a CRM record. */
export type CrmCustomData = Readonly<Record<string, unknown>>

/** A client organization. */
export interface OrganizationRecord {
  readonly id: Id
  readonly name: string
  readonly website: string | null
  readonly phone: string | null
  readonly email: string | null
  readonly ownerId: Id | null
  readonly sourceId: Id | null
  readonly customData: CrmCustomData
  readonly createdAt: number
  readonly updatedAt: number
}

/** A person, optionally linked to an organization. */
export interface ContactRecord {
  readonly id: Id
  readonly firstName: string
  readonly lastName: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly organizationId: Id | null
  readonly ownerId: Id | null
  readonly customData: CrmCustomData
  readonly createdAt: number
  readonly updatedAt: number
}

/** Fields shared by pipeline records (leads and deals); times are epoch ms. */
export interface PipelineFields {
  readonly ownerId: Id | null
  readonly assigneeIds: readonly Id[]
  readonly workflowId: Id
  readonly stageId: Id
  readonly stageEnteredAt: number
  readonly lostReasonId: Id | null
  readonly lostNote: string | null
  readonly customData: CrmCustomData
  readonly createdAt: number
  readonly updatedAt: number
}

/** A prospect before conversion into a deal. */
export interface LeadRecord extends PipelineFields {
  readonly id: Id
  readonly title: string
  readonly firstName: string | null
  readonly lastName: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly companyName: string | null
  readonly organizationId: Id | null
  readonly sourceId: Id | null
  readonly convertedAt: number | null
  readonly convertedDealId: Id | null
}

/** A sales opportunity. */
export interface DealRecord extends PipelineFields {
  readonly id: Id
  readonly title: string
  readonly organizationId: Id | null
  readonly contactIds: readonly Id[]
  readonly primaryContactId: Id | null
  readonly value: Money | null
  readonly expectedCloseAt: number | null
  readonly closedAt: number | null
  readonly sourceLeadId: Id | null
}

/** A named lookup: a lead source or a lost reason. */
export interface LookupRecord {
  readonly id: Id
  readonly name: string
}

/** Record type to record shape. */
export interface CrmRecords {
  readonly organization: OrganizationRecord
  readonly contact: ContactRecord
  readonly lead: LeadRecord
  readonly deal: DealRecord
}

type Draft<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

/** Record type to the fields a create call supplies. */
export interface CrmDrafts {
  readonly organization: Draft<OrganizationRecord>
  readonly contact: Draft<ContactRecord>
  readonly lead: Draft<LeadRecord>
  readonly deal: Draft<DealRecord>
}
