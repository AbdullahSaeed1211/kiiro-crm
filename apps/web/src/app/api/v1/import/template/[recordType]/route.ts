import config from '@payload-config'
import { resolveActor } from '@ops/adapter-payload'
import { getPayload, createLocalReq } from 'payload'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const CORE_FIELDS: Readonly<Record<string, readonly string[]>> = {
  organization: ['name', 'website', 'phone', 'email'],
  contact: ['firstName', 'lastName', 'email', 'phone', 'organization'],
  lead: ['title', 'firstName', 'lastName', 'email', 'phone', 'companyName', 'organization', 'source'],
  deal: ['title', 'organization', 'valueAmountMinor', 'valueCurrency', 'expectedCloseAt'],
  project: ['name', 'description', 'targetEndAt'],
  task: ['title', 'description', 'priority', 'startAt', 'dueAt'],
}

function csvCell(value: string): string {
  return /[",\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export async function GET(
  _request: Request,
  { params }: Readonly<{ params: Promise<{ recordType: string }> }>,
): Promise<Response> {
  const recordType = (await params).recordType
  if (!Object.hasOwn(CORE_FIELDS, recordType)) return notFound()
  const core = CORE_FIELDS[recordType]
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: new Headers(_request.headers) })
  if (auth.user === null) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const req = await createLocalReq({ user: auth.user }, payload)
  const actor = await resolveActor(req)
  if (actor?.active !== true || !['owner', 'manager'].includes(actor.role))
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  const custom = await payload.find({
    collection: 'fieldDefinitions',
    where: { recordType: { equals: recordType } },
    sort: 'position',
    pagination: false,
    depth: 0,
    req,
  })
  const customKeys = custom.docs.flatMap((field) =>
    typeof field.key === 'string' && field.key.trim() !== '' ? [field.key] : [],
  )
  const headers = [...core, ...customKeys.filter((key) => !core.includes(key))]
  const body = `${headers.map(csvCell).join(',')}\n`
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${recordType}-import-template.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
