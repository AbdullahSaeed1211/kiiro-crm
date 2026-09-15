import { requireOperator } from '../../../../../server/operator/auth'
import { previewTenantPlan } from '../../../../../server/operator/provision'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  await requireOperator()
  const input = await request.json().catch(() => undefined)
  if (typeof input !== 'object' || input === null)
    return Response.json({ error: 'Invalid tenant input.' }, { status: 400 })
  try {
    const values = input as Record<string, unknown>
    if (typeof values.slug !== 'string' || typeof values.displayName !== 'string')
      return Response.json({ error: 'Slug and display name are required.' }, { status: 400 })
    return Response.json(previewTenantPlan({ slug: values.slug, displayName: values.displayName }))
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid tenant input.' }, { status: 400 })
  }
}
