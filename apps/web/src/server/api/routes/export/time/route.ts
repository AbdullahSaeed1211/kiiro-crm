import { formatCsv } from '@ops/module-crm'
import { isManagerUp } from '@ops/platform'
import { findProductContext } from '../../../../auth/context'
import { loadTimeRows } from '../../../../time/report'
import { failure } from '../../../respond'
import { recordAuditEvent } from '../../../../audit/record'

const DAY_MS = 86_400_000
const DATE = /^\d{4}-\d{2}-\d{2}$/u

const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
const hours = (minutes: number): string => (minutes / 60).toFixed(2)

/** `GET /api/v1/export/time?from=YYYY-MM-DD&to=YYYY-MM-DD`: every time entry in the range as CSV, for billing and payroll. */
export async function GET(request: Request): Promise<Response> {
  const context = await findProductContext()
  if (context === null) return failure('UNAUTHORIZED', 'Sign in to export.')
  if (!isManagerUp(context.actor)) return failure('FORBIDDEN', 'Only owners and managers can export.')
  const params = new URL(request.url).searchParams
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  if (!DATE.test(from) || !DATE.test(to)) return failure('VALIDATION', 'Send from and to as YYYY-MM-DD.')
  const rows = await loadTimeRows(context, {
    fromMs: Date.parse(`${from}T00:00:00.000Z`),
    toMs: Date.parse(`${to}T00:00:00.000Z`) + DAY_MS - 1,
  })
  await recordAuditEvent(context, { verb: 'export.downloaded', summary: 'time', data: { from, to } })
  const csv = formatCsv([
    ['day', 'person', 'project', 'task', 'hours', 'minutes', 'note'],
    ...rows.map((row) => [
      day(row.day),
      row.person,
      row.project,
      row.task,
      hours(row.minutes),
      String(row.minutes),
      row.note,
    ]),
  ])
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="time-${from}-to-${to}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
