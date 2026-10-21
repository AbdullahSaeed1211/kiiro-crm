'use client'

import Link from 'next/link'
import type { AttendanceRecord } from '@ops/module-work'
import { buttonVariants } from '@ops/ui/components/ui/button'
import { DataTable } from '@ops/ui/composites/DataTable'
import type { AttendanceCopy } from '@/i18n/attendance-copy'

export function attendanceTime(value: number | null, { locale, zone }: { locale: string; zone: string }) {
  return value === null ? (
    '—'
  ) : (
    <time dateTime={new Date(value).toISOString()} title={String(value)}>
      {new Date(value).toLocaleString(locale, { timeZone: zone })}
    </time>
  )
}
function attendanceRow(
  r: AttendanceRecord,
  {
    names,
    copy,
    locale,
    zone,
  }: { names: Readonly<Record<string, string>>; copy: AttendanceCopy; locale: string; zone: string },
) {
  return {
    id: r.id,
    cells: {
      person: names[r.userId] ?? copy.person,
      started: attendanceTime(r.reportedCheckInAt, { locale, zone }),
      received: attendanceTime(r.submittedAt, { locale, zone }),
      ended: r.reportedCheckOutAt === null ? copy.open : attendanceTime(r.reportedCheckOutAt, { locale, zone }),
      endReceived: attendanceTime(r.checkOutSubmittedAt, { locale, zone }),
      hours:
        r.reportedCheckOutAt === null ? '—' : ((r.reportedCheckOutAt - r.reportedCheckInAt) / 3_600_000).toFixed(2),
      note: [r.note, r.checkOutNote].filter(Boolean).join(' · ') || '—',
    },
  }
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
  const columns = [
    { id: 'person', header: copy.person },
    { id: 'started', header: copy.started },
    { id: 'received', header: copy.received },
    { id: 'ended', header: copy.ended },
    { id: 'endReceived', header: copy.endReceived },
    { id: 'hours', header: copy.hours, numeric: true },
    { id: 'note', header: copy.note },
  ]
  const rows = records.map((r) => attendanceRow(r, { names, copy, locale, zone }))
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
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
      <span className="text-xs text-muted-foreground">{copy.history}</span>
    </div>
  )
  return (
    <DataTable
      columns={columns}
      rows={rows}
      selectable={false}
      pagination={{ page: 1, pageSize: 100, total: rows.length }}
      labels={copy}
      mobileCard={{ cells: ['person', 'started', 'received', 'ended', 'endReceived', 'hours', 'note'] }}
      emptyState={<p className="p-6 text-sm text-muted-foreground">{copy.empty}</p>}
      toolbarStart={toolbar}
    />
  )
}
