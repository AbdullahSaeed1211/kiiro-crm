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
export type { AccessResource, Action, Actor, Can, Role, ScopeFilter } from './contracts/access'
export type { MailMessage, MailSender, StageStore, UnitOfWork } from './contracts/ports'
export type { NotificationInput, NotificationStore, NotificationType } from './contracts/notifications'
