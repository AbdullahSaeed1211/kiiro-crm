'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AttendanceRecord } from '@ops/module-work'
import { buttonVariants } from '@ops/ui/components/ui/button'
import type { AttendanceCopy } from '@/i18n/attendance-copy'

type TimeOptions = Readonly<{ locale: string; zone: string }>

export function attendanceTime(value: number | null, { locale, zone }: TimeOptions): ReactNode {
  return value === null ? (
    <span>—</span>
  ) : (
    <time dateTime={new Date(value).toISOString()} title={String(value)}>
      {new Date(value).toLocaleString(locale, { timeZone: zone })}
    </time>
  )
}

function attendanceDay(value: number, { locale, zone }: TimeOptions) {
  return (
    <time dateTime={new Date(value).toISOString()} title={String(value)}>
      {new Date(value).toLocaleDateString(locale, { timeZone: zone, dateStyle: 'medium' })}
    </time>
  )
}

function attendanceClock({
  value,
  options,
  compareTo,
}: Readonly<{ value: number; options: TimeOptions; compareTo?: number }>) {
  const fullDateTime = new Date(value).toLocaleString(options.locale, { timeZone: options.zone })
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: options.zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const isDifferentDay = compareTo !== undefined && dayFormatter.format(value) !== dayFormatter.format(compareTo)

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <time dateTime={new Date(value).toISOString()} title={`${fullDateTime} (${String(value)})`}>
        {new Date(value).toLocaleTimeString(options.locale, { timeZone: options.zone, timeStyle: 'short' })}
      </time>
      {isDifferentDay ? (
        <span className="text-xs text-muted-foreground">
          · {new Date(value).toLocaleDateString(options.locale, { timeZone: options.zone, dateStyle: 'short' })}
        </span>
      ) : null}
    </span>
  )
}

function AuditValue({ value, locale, zone }: Readonly<{ value: number | null; locale: string; zone: string }>) {
  return (
    <div className="grid gap-1 sm:grid-cols-[minmax(10rem,1fr)_auto] sm:items-baseline">
      {attendanceTime(value, { locale, zone })}
      <code className="text-xs text-muted-foreground">{value ?? '—'}</code>
    </div>
  )
}

function AuditField({
  label,
  value,
  locale,
  zone,
}: Readonly<{ label: string; value: number | null; locale: string; zone: string }>) {
  return (
    <div className="grid gap-1 text-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>
        <AuditValue value={value} locale={locale} zone={zone} />
      </dd>
    </div>
  )
}

function AttendanceSummary({
  record,
  names,
  team,
  copy,
  locale,
  zone,
  duration,
}: Readonly<{
  record: AttendanceRecord
  names: Readonly<Record<string, string>>
  team: boolean
  copy: AttendanceCopy
  locale: string
  zone: string
  duration: string
}>) {
  return (
    <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center [&::-webkit-details-marker]:hidden">
      <div
        className={`grid min-w-0 flex-1 grid-cols-2 gap-3 sm:items-center ${team ? 'sm:grid-cols-[minmax(7rem,1fr)_minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(5rem,0.6fr)]' : 'sm:grid-cols-[minmax(8rem,1.2fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(5rem,0.6fr)]'}`}
      >
        <div className="col-span-2 grid gap-1 sm:col-span-1">
          <span className="text-xs text-muted-foreground">{copy.day}</span>
          <span className="font-medium">{attendanceDay(record.reportedCheckInAt, { locale, zone })}</span>
        </div>
        {team ? (
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">{copy.person}</span>
            <span className="font-medium">{names[record.userId] ?? copy.person}</span>
          </div>
        ) : null}
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">{copy.in}</span>
          <span className="tabular-nums">
            {attendanceClock({ value: record.reportedCheckInAt, options: { locale, zone } })}
          </span>
        </div>
        <div className="grid gap-1">
          <span className="text-xs text-muted-foreground">{copy.out}</span>
          <span className="tabular-nums">
            {record.reportedCheckOutAt === null
              ? copy.open
              : attendanceClock({
                  value: record.reportedCheckOutAt,
                  options: { locale, zone },
                  compareTo: record.reportedCheckInAt,
                })}
          </span>
        </div>
        <div className="grid gap-1 sm:text-right">
          <span className="text-xs text-muted-foreground">{copy.duration}</span>
          <span className="tabular-nums">{duration}</span>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        {copy.expandDetails}
        <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
      </span>
    </summary>
  )
}

function AttendanceAuditDetails({
  record,
  copy,
  locale,
  zone,
}: Readonly<{
  record: AttendanceRecord
  copy: AttendanceCopy
  locale: string
  zone: string
}>) {
  return (
    <div className="grid gap-4 border-t bg-muted/20 p-4">
      <p className="text-xs text-muted-foreground">{copy.audit}</p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <AuditField label={copy.reportedCheckIn} value={record.reportedCheckInAt} locale={locale} zone={zone} />
        <AuditField label={copy.checkInSubmitted} value={record.submittedAt} locale={locale} zone={zone} />
        <AuditField label={copy.reportedCheckOut} value={record.reportedCheckOutAt} locale={locale} zone={zone} />
        <AuditField label={copy.checkOutSubmitted} value={record.checkOutSubmittedAt} locale={locale} zone={zone} />
      </dl>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1 text-sm">
          <dt className="text-xs text-muted-foreground">{copy.checkInNote}</dt>
          <dd className="break-words whitespace-pre-wrap">{record.note || '—'}</dd>
        </div>
        <div className="grid gap-1 text-sm">
          <dt className="text-xs text-muted-foreground">{copy.checkOutNote}</dt>
          <dd className="break-words whitespace-pre-wrap">{record.checkOutNote || '—'}</dd>
        </div>
      </dl>
    </div>
  )
}

type AttendanceRecordRowProps = Readonly<{
  record: AttendanceRecord
  names: Readonly<Record<string, string>>
  team: boolean
  copy: AttendanceCopy
  locale: string
  zone: string
}>

function AttendanceRecordRow({ record, names, team, copy, locale, zone }: AttendanceRecordRowProps) {
  const duration =
    record.reportedCheckOutAt === null
      ? '—'
      : `${((record.reportedCheckOutAt - record.reportedCheckInAt) / 3_600_000).toFixed(2)} ${copy.hoursUnit}`

  return (
    <details className="group rounded-lg border bg-card open:shadow-sm">
      <AttendanceSummary
        record={record}
        names={names}
        team={team}
        copy={copy}
        locale={locale}
        zone={zone}
        duration={duration}
      />
      <AttendanceAuditDetails record={record} copy={copy} locale={locale} zone={zone} />
    </details>
  )
}

export function AttendanceHistory({
  records,
  names,
  team,
  admin,
  copy,
  locale,
  zone,
}: Readonly<{
  records: readonly AttendanceRecord[]
  names: Readonly<Record<string, string>>
  team: boolean
  admin: boolean
  copy: AttendanceCopy
  locale: string
  zone: string
}>) {
  const rowProps = { names, team, copy, locale, zone }
  return (
    <section className="grid gap-3" aria-labelledby="attendance-history-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="attendance-history-heading" className="text-lg font-medium">
          {copy.history}
        </h2>
        <nav aria-label={copy.historyViews} className="flex flex-wrap items-center gap-2">
          <Link href="/attendance" className={buttonVariants({ variant: team ? 'ghost' : 'secondary', size: 'sm' })}>
            {copy.mine}
          </Link>
          {admin ? (
            <Link
              href="/attendance?view=team"
              className={buttonVariants({ variant: team ? 'secondary' : 'ghost', size: 'sm' })}
            >
              {copy.team}
            </Link>
          ) : null}
        </nav>
      </div>
      {records.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{copy.historyBounded}</p>
          <div className="grid gap-2">
            {records.map((record) => (
              <AttendanceRecordRow key={record.id} record={record} {...rowProps} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
