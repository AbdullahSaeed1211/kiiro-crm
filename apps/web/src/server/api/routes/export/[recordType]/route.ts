import { isManagerUp } from '@ops/platform'
import { actionError } from '../../../../action-result'
import { findProductContext } from '../../../../auth/context'
import { exportCsv } from '../../../../crm/export'

const TYPES = { organizations: 'organization', contacts: 'contact', leads: 'lead', deals: 'deal' } as const

/** `GET /api/v1/export/<organizations|contacts|leads|deals>`: a CSV of every record the signed-in owner or manager can read. */
export async function GET(_request: Request, route: { params: Promise<{ recordType: string }> }): Promise<Response> {
  const context = await findProductContext()
  if (context === null) return Response.json(actionError('FORBIDDEN', 'Sign in to export.'), { status: 401 })
  if (!isManagerUp(context.actor))
    return Response.json(actionError('FORBIDDEN', 'Only owners and managers can export.'), { status: 403 })
  const { recordType } = await route.params
  if (!Object.hasOwn(TYPES, recordType))
    return Response.json(actionError('NOT_FOUND', 'Unknown record type.'), { status: 404 })
  const csv = await exportCsv(context, TYPES[recordType as keyof typeof TYPES])
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${recordType}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
