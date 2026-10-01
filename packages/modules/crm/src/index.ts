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
export type { ArchivedRecord, CrmDeps, CrmRepository, LookupKind } from './ports/repository'
export * from './commands/public'
export { setCustomFieldsSchema } from './schema'
export { STANDARD_STAGE_FIELDS } from './domain/stage-requirements'
export { leadMoveDestinationError } from './domain/lead-moves'
export { formatCsv } from './domain/csv'
export { exportTable, type ExportLookups } from './domain/export'
export { pipelineSummary, type MonthTotal, type PipelineSummary, type StageTotal } from './domain/insights'
export { FOLLOW_UP_BUCKETS, groupFollowUps, type FollowUpBucket } from './domain/follow-ups'
export { leadRulesSchema, nextOwner, responseOverdue, ruleFor, type LeadRule } from './domain/lead-rules'
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
export {
  ALL_EVENTS,
  deliverWebhook,
  describeDelivery,
  webhooksFor,
  webhooksSchema,
  type DeliveryResult,
  type Webhook,
  type WebhookEvent,
} from './webhooks/webhooks'
