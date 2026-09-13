/** Public API of @ops/module-crm. */
export type {
  ContactRecord,
  CrmCustomData,
  CrmDrafts,
  CrmRecords,
  CrmRecordType,
  DealRecord,
  LeadRecord,
  LookupRecord,
  OrganizationRecord,
  PipelineFields,
} from './ports/records'
export type { CrmDeps, CrmRepository, LookupKind } from './ports/repository'
export * from './commands/public'
