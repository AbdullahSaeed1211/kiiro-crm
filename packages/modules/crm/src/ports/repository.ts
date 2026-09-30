import type { Clock, Id, Result } from '@ops/kernel'
import type { Actor, Can, FieldDefinition, StageStore, UnitOfWork, Workflow } from '@ops/platform'
import type { ContactRecord, CrmDrafts, CrmRecords, CrmRecordType, DealRecord, LookupRecord } from './records'

/** A record an owner or manager archived, as the archive screen lists it. */
export interface ArchivedRecord {
  readonly type: CrmRecordType
  readonly id: Id
  readonly label: string
  readonly archivedAt: number
  readonly updatedAt: number
}

/** Lookup kinds of spec §10.1. */
export type LookupKind = 'source' | 'lostReason'

/**
 * CRM persistence. Reads apply the request user's access; `update` writes only while the record still has
 * `expectedUpdatedAt` and returns `undefined` otherwise. Stage moves for leads and deals go through platform
 * `changeStage`, so `loadRecord` and `saveStage` must support the `lead` and `deal` record types.
 */
export interface CrmRepository extends StageStore {
  get<T extends CrmRecordType>(type: T, id: Id): Promise<CrmRecords[T] | undefined>
  list<T extends CrmRecordType>(type: T): Promise<readonly CrmRecords[T][]>
  create<T extends CrmRecordType>(type: T, draft: CrmDrafts[T]): Promise<Result<CrmRecords[T]>>
  update<T extends CrmRecordType>(
    type: T,
    id: Id,
    patch: Partial<CrmDrafts[T]>,
    expectedUpdatedAt: number,
  ): Promise<CrmRecords[T] | undefined>
  /** Hides the record from every list and search while it still has `expectedUpdatedAt`; false when it changed meanwhile. */
  archive(type: CrmRecordType, id: Id, expectedUpdatedAt: number): Promise<boolean>
  /** Archived records of one type, newest first; owners and managers only see any. */
  listArchived(type: CrmRecordType): Promise<readonly ArchivedRecord[]>
  /** Brings an archived record back while it still has `expectedUpdatedAt`; false when it changed meanwhile. */
  restore(type: CrmRecordType, id: Id, expectedUpdatedAt: number): Promise<boolean>
  findContactByEmail(email: string): Promise<ContactRecord | undefined>
  loadDefaultWorkflow(recordType: 'lead' | 'deal'): Promise<Result<Workflow>>
  listLookups(kind: LookupKind): Promise<readonly LookupRecord[]>
  /** The tenant's field definitions for a record type, including hidden ones. */
  loadFieldDefinitions(type: CrmRecordType): Promise<readonly FieldDefinition[]>
}

/** Per-request dependencies of CRM commands. */
export interface CrmDeps {
  readonly actor: Actor
  readonly can: Can
  readonly repo: CrmRepository
  readonly uow: UnitOfWork
  readonly clock: Clock
  /**
   * Runs after a deal first closes in a won stage, for follow-up work such as an onboarding project.
   * It must not throw: a failure here is logged by the caller's composition, never undoes the move.
   */
  readonly onDealWon?: (deal: DealRecord) => Promise<void>
}
