/** Public API of @ops/platform. */
export type { RecordRef, StageTrackedRecord } from './contracts/records'
export type {
  ChangeStageCommand,
  ChangeStageInput,
  Stage,
  StageCategory,
  StageColor,
  StageTransition,
  Workflow,
} from './contracts/workflows'
export type {
  AccessResource,
  Action,
  Actor,
  Can,
  Role,
  ScopeDefinition,
  ScopeExtension,
  ScopeFilter,
} from './contracts/access'
export type { MailAttachment, MailMessage, MailSender, StageStore, UnitOfWork } from './contracts/ports'
export type { NotificationInput, NotificationStore, NotificationType } from './contracts/notifications'
export { can, inScope, isManagerUp } from './permissions/policy'
export { createScopeFilter, MATCH_NOTHING } from './permissions/scope'
export { changeStage, type ChangeStageDeps } from './workflows/change-stage'
