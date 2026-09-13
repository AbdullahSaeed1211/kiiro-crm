import type { Clock, Id } from '@ops/kernel'
import type { Actor, Can, StageStore, UnitOfWork, Workflow } from '@ops/platform'
import type { ContactRecord, CrmDrafts, CrmRecords, CrmRecordType, LookupRecord } from './records'

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
  create<T extends CrmRecordType>(type: T, draft: CrmDrafts[T]): Promise<CrmRecords[T]>
  update<T extends CrmRecordType>(
    type: T,
    id: Id,
    patch: Partial<CrmDrafts[T]>,
    expectedUpdatedAt: number,
  ): Promise<CrmRecords[T] | undefined>
  findContactByEmail(email: string): Promise<ContactRecord | undefined>
  loadDefaultWorkflow(recordType: 'lead' | 'deal'): Promise<Workflow>
  listLookups(kind: LookupKind): Promise<readonly LookupRecord[]>
}

/** Per-request dependencies of CRM commands. */
export interface CrmDeps {
  readonly actor: Actor
  readonly can: Can
  readonly repo: CrmRepository
  readonly uow: UnitOfWork
  readonly clock: Clock
}
