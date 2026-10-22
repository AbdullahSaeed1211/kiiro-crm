import { NOTIFICATION_COPY, type Locale } from '../../i18n/config'
import { formatDate } from '../../i18n/format'
import { taskHref } from './task-navigation'

export interface NotificationItem {
  readonly id: string
  readonly type?: string
  readonly recordType?: string
  readonly recordId?: string | null
  readonly readAt?: number | null
  readonly createdAt?: string
  readonly data?: Readonly<Record<string, unknown>>
}

export interface NotificationPresentation {
  readonly kind: string
  readonly title: string
  readonly action?: string
  readonly scheduledAt?: string
}

const RECORD_ROUTES: Readonly<Partial<Record<string, string>>> = {
  organization: 'organizations',
  contact: 'contacts',
  lead: 'leads',
  deal: 'deals',
  project: 'projects',
  task: 'tasks',
}

const KIND_KEYS: Readonly<Record<string, string>> = {
  assigned: 'assigned',
  mentioned: 'mentioned',
  due_soon: 'dueSoon',
  overdue: 'overdue',
  digest: 'digest',
  intake_received: 'intakeReceived',
  email_received: 'emailReceived',
  invitation_accepted: 'invitationAccepted',
  stalled: 'stalled',
}

const ACTION_KEYS: Readonly<Partial<Record<string, string>>> = {
  task: 'openTask',
  lead: 'openLead',
  contact: 'openContact',
}

function humanize(value = 'Update'): string {
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

function scheduleData(item: NotificationItem): Readonly<{ kind?: string; startsAt?: number }> | undefined {
  const value = item.data?.schedule
  if (typeof value !== 'object' || value === null) return undefined
  const kind: unknown = Reflect.get(value, 'kind')
  const startsAt: unknown = Reflect.get(value, 'startsAt')
  return {
    ...(kind === 'callback' || kind === 'appointment' ? { kind } : {}),
    ...(typeof startsAt === 'number' && Number.isFinite(startsAt) ? { startsAt } : {}),
  }
}

function typeKindLabel(item: NotificationItem, locale: Locale): string {
  const copy = NOTIFICATION_COPY[locale]
  const key = item.type === undefined ? undefined : KIND_KEYS[item.type]
  return (key === undefined ? undefined : copy[key]) ?? humanize(item.type)
}

function scheduleTitleLabel(item: NotificationItem, locale: Locale): string | undefined {
  const kind = scheduleData(item)?.kind
  if (kind === undefined) return undefined
  const copy = NOTIFICATION_COPY[locale]
  return kind === 'callback' ? copy.callback : copy.appointment
}

function kindLabel(item: NotificationItem, locale: Locale): string {
  const scheduleKind = scheduleData(item)?.kind
  if (scheduleKind === undefined) return typeKindLabel(item, locale)
  const copy = NOTIFICATION_COPY[locale]
  const scheduleLabel = scheduleKind === 'callback' ? copy.callback : copy.appointment
  return `${scheduleLabel} · ${typeKindLabel(item, locale)}`
}

function actionLabel(item: NotificationItem, locale: Locale): string | undefined {
  const copy = NOTIFICATION_COPY[locale]
  if (
    typeof item.recordId !== 'string' ||
    item.recordType === undefined ||
    RECORD_ROUTES[item.recordType] === undefined
  )
    return undefined
  const actionKey = ACTION_KEYS[item.recordType]
  return (actionKey === undefined ? undefined : copy[actionKey]) ?? copy.openRecord
}

function scheduledAt(item: NotificationItem, locale: Locale): string | undefined {
  const startsAt = scheduleData(item)?.startsAt
  if (startsAt === undefined) return undefined
  return formatDate(startsAt, locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function notificationTitle(item: NotificationItem, locale: Locale): string {
  const title = item.data?.message ?? item.data?.title
  if (typeof title === 'string' && title.trim() !== '') return title
  return scheduleTitleLabel(item, locale) ?? humanize(item.type)
}

function optionalDetails(
  action: string | undefined,
  eventTime: string | undefined,
): Pick<NotificationPresentation, 'action' | 'scheduledAt'> {
  return {
    ...(action === undefined ? {} : { action }),
    ...(eventTime === undefined ? {} : { scheduledAt: eventTime }),
  }
}

export function presentNotification(item: NotificationItem, locale: Locale): NotificationPresentation {
  const eventTime = scheduledAt(item, locale)
  const action = actionLabel(item, locale)
  return {
    kind: kindLabel(item, locale),
    title: notificationTitle(item, locale),
    ...optionalDetails(action, eventTime),
  }
}

export function notificationHref(item: NotificationItem, pathname: string, search: string): string | undefined {
  const route = item.recordType === undefined ? undefined : RECORD_ROUTES[item.recordType]
  if (route === undefined || typeof item.recordId !== 'string') return undefined
  return item.recordType === 'task'
    ? taskHref(item.recordId, `${pathname}${search}`)
    : `/${route}/${encodeURIComponent(item.recordId)}`
}
