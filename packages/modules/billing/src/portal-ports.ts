import type { Clock, Id } from '@ops/kernel'
import type { Actor } from '@ops/platform'
import type { BillingAuditEvent, BillingDocument, DocumentChange } from './ports'

/** A link that lets one client contact see their company's quotes, invoices and projects. Times are epoch ms. */
export interface PortalLink {
  readonly id: Id
  readonly organizationId: Id
  readonly contactId: Id
  readonly email: string
  /** SHA-256 of the token; the token itself is shown once and never stored. */
  readonly tokenHash: string
  readonly expiresAt: number
  readonly revokedAt: number | null
  readonly lastOpenedAt: number | null
  readonly createdById: Id
  readonly createdAt: number
}

export type NewPortalLink = Omit<PortalLink, 'id' | 'revokedAt' | 'lastOpenedAt' | 'createdAt'>

export interface PortalLinkStore {
  create(input: NewPortalLink): Promise<PortalLink>
  get(id: Id): Promise<PortalLink | undefined>
  findByTokenHash(tokenHash: string): Promise<PortalLink | undefined>
  listForOrganization(organizationId: Id): Promise<readonly PortalLink[]>
  markRevoked(id: Id, at: number): Promise<void>
  markOpened(id: Id, at: number): Promise<void>
}

/** A contact as the portal needs it: whose company they belong to and where the link goes. */
export interface PortalContact {
  readonly id: Id
  readonly organizationId: Id | null
  readonly email: string
  readonly name: string
}

/** A project's progress as the client sees it: no internal notes, people or task names. */
export interface PortalProject {
  readonly id: Id
  readonly name: string
  readonly stage: string
  readonly dueAt: number | null
  readonly openTasks: number
  readonly doneTasks: number
}

/** Reads for the public portal. They run as the system, so every read is narrowed to one organization. */
export interface PortalReader {
  organizationName(id: Id): Promise<string | undefined>
  documents(organizationId: Id): Promise<readonly BillingDocument[]>
  projects(organizationId: Id): Promise<readonly PortalProject[]>
}

export interface PortalTokens {
  newToken(): Promise<{ readonly token: string; readonly tokenHash: string }>
  hash(token: string): Promise<string>
}

/** Staff sending, listing and revoking links; the contact read applies the staff member's access. */
export interface PortalStaffDeps {
  readonly actor: Actor
  readonly links: PortalLinkStore
  readonly visibleContact: (id: Id) => Promise<PortalContact | undefined>
  readonly tokens: PortalTokens
  readonly clock: Clock
  readonly audit: (event: BillingAuditEvent) => Promise<void>
}

/** The client's side: only a token, no session. */
export interface PortalPublicDeps {
  readonly links: PortalLinkStore
  readonly reader: PortalReader
  /** Compare-and-set on the document's `updatedAt`; `undefined` when it changed meanwhile. */
  readonly decide: (document: BillingDocument, change: DocumentChange) => Promise<BillingDocument | undefined>
  readonly tokens: Pick<PortalTokens, 'hash'>
  readonly clock: Clock
  readonly audit: (event: BillingAuditEvent) => Promise<void>
}

/** Everything the client may see through one link. */
export interface PortalView {
  readonly link: PortalLink
  readonly organizationName: string
  readonly quotes: readonly BillingDocument[]
  readonly invoices: readonly BillingDocument[]
  readonly projects: readonly PortalProject[]
}
