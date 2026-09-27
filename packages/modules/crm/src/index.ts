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
export { setCustomFieldsSchema } from './schema'
export { STANDARD_STAGE_FIELDS } from './domain/stage-requirements'
export {
  convertLeadSchema,
  createContactSchema,
  createDealSchema,
  createLeadSchema,
  createOrganizationSchema,
  markLostSchema,
  moveDealSchema,
  moveLeadSchema,
  updateContactSchema,
  updateDealSchema,
  updateLeadSchema,
  updateOrganizationSchema,
} from './schema'
