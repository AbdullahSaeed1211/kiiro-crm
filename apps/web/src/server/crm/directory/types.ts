import type { ContactRecord, OrganizationRecord } from '@ops/module-crm'

export interface PersonSummary {
  readonly id: string
  readonly name: string
  readonly email: string
}

export interface ActivityItem {
  readonly id: string
  readonly occurredAt: number
  readonly actorName: string | null
  readonly summary: string
}

export interface EmailThreadMessage {
  readonly id: string
  readonly direction: 'inbound' | 'outbound'
  readonly from: string
  readonly to: readonly string[]
  readonly subject: string
  readonly textBody: string
  readonly status: 'queued' | 'sent' | 'failed' | 'received' | 'quarantined'
  readonly occurredAt: number
}

export interface OrganizationListItem {
  readonly record: OrganizationRecord
  readonly owner: PersonSummary | null
  readonly openDeals: number
}

export interface ContactListItem {
  readonly record: ContactRecord
  readonly organization: { readonly id: string; readonly name: string } | null
  readonly owner: PersonSummary | null
}
