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
  readonly threadKey: string
  readonly isRead: boolean
  readonly attachments: readonly { readonly id: string; readonly fileName: string }[]
}

export interface InboxEmailMessage extends EmailThreadMessage {
  readonly recordType: string | null
  readonly recordId: string | null
}

export interface RelatedTask {
  readonly id: string
  readonly title: string
  readonly priority: string
  readonly dueAt: number | null
  readonly completedAt: number | null
}

export interface RecordAttachment {
  readonly id: string
  readonly fileName: string
  readonly mime: string
  readonly sizeBytes: number
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
