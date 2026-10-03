import { formatCsv } from '@ops/module-crm'
import { isManagerUp } from '@ops/platform'
import { findProductContext, type ProductContext } from '../../../../auth/context'
import { recordAuditEvent } from '../../../../audit/record'
import { loadAuditForExport } from '../../../../audit/audit-log'
import { loadActivityForExport } from '../../../../crm/activity-log'
import { failure } from '../../../respond'

function csvResponse(csv: string, name: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

const param = (params: URLSearchParams, name: string): string => params.get(name) ?? ''

/** The security and settings log as CSV; `log=security` selects it and the other filters narrow it. */
async function securityCsv(context: ProductContext, params: URLSearchParams): Promise<Response> {
  const rows = await loadAuditForExport(context, {
    actor: param(params, 'actor'),
    verb: param(params, 'event'),
    from: param(params, 'from'),
    to: param(params, 'to'),
  })
  await recordAuditEvent(context, { verb: 'export.downloaded', summary: 'security log', data: { rows: rows.length } })
  return csvResponse(
    formatCsv([
      ['time', 'person', 'event', 'detail'],
      ...rows.map((row) => [new Date(row.occurredAt).toISOString(), row.actor, row.verb, row.summary]),
    ]),
    'security',
  )
}

/**
 * `GET /api/v1/export/activity`: the change log as CSV, newest first, up to 5000 rows. It takes the same filters as the
 * Activity page: `actor`, `type`, `event`, `from` and `to`. With `log=security` it returns the security log instead.
 */
export async function GET(request: Request): Promise<Response> {
  const context = await findProductContext()
  if (context === null) return failure('UNAUTHORIZED', 'Sign in to export.')
  if (!isManagerUp(context.actor)) return failure('FORBIDDEN', 'Only owners and managers can export.')
  const params = new URL(request.url).searchParams
  if (params.get('log') === 'security') return securityCsv(context, params)
  const rows = await loadActivityForExport(context, {
    actor: param(params, 'actor'),
    recordType: param(params, 'type'),
    verb: param(params, 'event'),
    from: param(params, 'from'),
    to: param(params, 'to'),
  })
  await recordAuditEvent(context, { verb: 'export.downloaded', summary: 'activity', data: { rows: rows.length } })
  return csvResponse(
    formatCsv([
      ['time', 'person', 'event', 'record type', 'record id'],
      ...rows.map((row) => [new Date(row.occurredAt).toISOString(), row.actor, row.verb, row.recordType, row.recordId]),
    ]),
    'activity',
  )
}
