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
export type { CallLogRecord, ScheduleItemRecord } from './ports/records'
export * from './commands/public'
export { setCustomFieldsSchema } from './schema'
export { STANDARD_STAGE_FIELDS } from './domain/stage-requirements'
export { leadMoveDestinationError } from './domain/lead-moves'
export { formatCsv, parseCsv } from './domain/csv'
export { CORE_COLUMNS } from './commands/import'
export { exportTable, type ExportLookups } from './domain/export'
export {
  pipelineSummary,
  type MonthTotal,
  type PipelineDeal,
  type PipelineLead,
  type PipelineSummary,
  type StageTotal,
} from './domain/insights'
export { FOLLOW_UP_BUCKETS, groupFollowUps, type FollowUpBucket } from './domain/follow-ups'
export { leadRulesSchema, nextOwner, responseOverdue, ruleFor, type LeadRule } from './domain/lead-rules'
export {
  convertLeadSchema,
  createScheduleItemSchema,
  logCallSchema,
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
  updateScheduleItemSchema,
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

export type {
  VoiceMode,
  VoiceCallState,
  VoiceOutcome,
  VoiceSettings,
  VoiceNumber,
  VoiceCall,
  VoiceDevice,
  VoiceEvent,
  VoiceOperation,
  VoiceOffer,
  VoiceSnapshot,
  VoiceClientSession,
  VoiceDialResult,
  VoiceProviderConfig,
} from './voice-contracts'
export type { VoiceCallLeg, VoiceRepository } from './ports/voice'
export type { VoiceProvider } from './ports/voice-provider'
export {
  actionVoiceCall,
  isVoiceManager,
  purchaseVoiceNumber,
  releaseVoiceNumber,
  searchVoiceNumbers,
  signVoiceClientState,
  signVoiceOffer,
  startVoiceCall,
  stopVoiceSession,
  updateVoiceNumber,
  updateVoiceSettings,
  verifyParkedCallClientState,
  verifyVoiceClientState,
  voiceModeFor,
  voiceSession,
  voiceSnapshot,
} from './voice-engine'
export type { VoiceEngineDeps } from './voice-engine'
export {
  voiceCallActionSchema,
  voiceDialSchema,
  voiceNumberPurchaseSchema,
  voiceNumberReleaseSchema,
  voiceNumberSearchSchema,
  voiceNumberUpdateSchema,
  voiceSessionSchema,
  voiceSettingsSchema,
} from './voice-schema'
