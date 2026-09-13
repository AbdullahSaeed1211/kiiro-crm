import type { NotificationType, Role, StageCategory, StageColor } from '@ops/platform'
import { RECORD_TYPES } from '../contracts/names'

/** User roles of decision D-27, first the most privileged. */
export const ROLE_VALUES = ['owner', 'manager', 'staff'] as const satisfies readonly Role[]

/** Record types that workflows, activity, attachments and polymorphic references may name in the spike. */
export const RECORD_TYPE_VALUES = Object.values(RECORD_TYPES)

/** Stage categories of decision D-28. */
export const STAGE_CATEGORY_VALUES = [
  'backlog',
  'open',
  'active',
  'waiting',
  'done_success',
  'done_failure',
  'cancelled',
] as const satisfies readonly StageCategory[]

/** Categories that end a record's journey (spec §9.4 `isTerminal`). */
export const TERMINAL_CATEGORY_VALUES = [
  'done_success',
  'done_failure',
  'cancelled',
] as const satisfies readonly StageCategory[]

/** Stage palette of spec §9.4. */
export const STAGE_COLOR_VALUES = [
  'gray',
  'blue',
  'green',
  'amber',
  'red',
  'violet',
  'teal',
  'pink',
] as const satisfies readonly StageColor[]

/** Task priorities of spec §10.2. */
export const PRIORITY_VALUES = ['none', 'low', 'medium', 'high', 'urgent'] as const

/** Activity verbs of spec §9.5. */
export const ACTIVITY_VERB_VALUES = [
  'record.created',
  'field.changed',
  'stage.changed',
  'assignment.changed',
  'comment.added',
  'mention.added',
  'attachment.added',
  'attachment.downloaded',
  'email.sent',
  'email.received',
  'relation.linked',
  'record.converted',
] as const

/** Notification types of spec §9.8. */
export const NOTIFICATION_TYPE_VALUES = [
  'assigned',
  'mentioned',
  'due_soon',
  'overdue',
  'digest',
  'intake_received',
  'email_received',
  'invitation_accepted',
  'stalled',
] as const satisfies readonly NotificationType[]

/**
 * Upload MIME allowlist of spec §9.7 (pdf, png, jpeg, webp, gif, txt, csv, docx, xlsx, pptx, zip). Zip has two entries
 * because some browsers report zip archives as `application/x-zip-compressed`.
 */
export const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
] as const

/** Email directions of spec §10.4. */
export const EMAIL_DIRECTION_VALUES = ['outbound', 'inbound'] as const

/** Email delivery states of spec §10.4. */
export const EMAIL_STATUS_VALUES = ['queued', 'sent', 'failed', 'received', 'quarantined'] as const

/** Job run states; a run is claimed as `running` so a duplicate cron invocation for the same window is skipped (§13). */
export const JOB_RUN_STATUS_VALUES = ['running', 'completed', 'failed'] as const

/** Locales the settings global accepts (spec §9.12). */
export const LOCALE_VALUES = ['en', 'es'] as const

/** Corner radius presets of the brand settings (spec §9.12). */
export const RADIUS_VALUES = ['sm', 'md', 'lg'] as const

/** Sender verification states of the email settings (spec §9.12). */
export const SENDER_STATUS_VALUES = ['unverified', 'verified'] as const
