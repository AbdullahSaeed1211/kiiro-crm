import type { Clock, Id, Result } from '@ops/kernel'
import type { Actor, Can } from '@ops/platform'
import type { DocumentStatus, Totals } from './domain'
import type { DocumentKind, DocumentLine } from './schema'

/** A quote or an invoice as stored. Times are epoch milliseconds. */
export interface BillingDocument extends Totals {
  readonly id: Id
  readonly kind: DocumentKind
  readonly number: string
  readonly organizationId: Id
  readonly dealId: Id | null
  readonly contactId: Id | null
  readonly currency: string
  readonly status: DocumentStatus
  readonly lines: readonly DocumentLine[]
  readonly note: string | null
  /** A quote's valid-until time, or an invoice's due time. */
  readonly dueAt: number | null
  readonly paymentLink: string | null
  readonly sourceQuoteId: Id | null
  readonly sentAt: number | null
  readonly decidedAt: number | null
  readonly paidAt: number | null
  readonly createdById: Id
  readonly createdAt: number
  readonly updatedAt: number
}

/** What is saved for a new document; the repository adds the id, number and times. */
export interface NewDocument extends Totals {
  readonly kind: DocumentKind
  readonly organizationId: Id
  readonly dealId: Id | null
  readonly contactId: Id | null
  readonly currency: string
  readonly lines: readonly DocumentLine[]
  readonly note: string | null
  readonly dueAt: number | null
  readonly paymentLink: string | null
  readonly sourceQuoteId: Id | null
  readonly createdById: Id
}

/** The fields a change may set; the status fields move together with the state. */
export interface DocumentChange extends Partial<Totals> {
  readonly contactId?: Id | null
  readonly lines?: readonly DocumentLine[]
  readonly note?: string | null
  readonly dueAt?: number | null
  readonly paymentLink?: string | null
  readonly status?: DocumentStatus
  readonly sentAt?: number
  readonly decidedAt?: number
  readonly paidAt?: number
}

export interface BillingRepository {
  get(id: Id): Promise<BillingDocument | undefined>
  /** Saves a new document with the next number of its kind. */
  create(input: NewDocument): Promise<BillingDocument>
  /** Returns `undefined` when the document changed since `expectedUpdatedAt` or does not exist. */
  update(input: { id: Id; expectedUpdatedAt: number; change: DocumentChange }): Promise<BillingDocument | undefined>
  /** Whether the organization exists and the actor may see it. */
  organizationVisible(id: Id): Promise<boolean>
}

/** One event for the security log: what happened, to which document, with a few details. */
export interface BillingAuditEvent {
  readonly verb: string
  readonly summary: string
  readonly data?: Record<string, unknown>
}

export interface BillingDeps {
  readonly actor: Actor
  readonly can: Can
  readonly repo: BillingRepository
  readonly clock: Clock
  readonly audit: (event: BillingAuditEvent) => Promise<void>
}

export type BillingResult<T> = Result<T>
