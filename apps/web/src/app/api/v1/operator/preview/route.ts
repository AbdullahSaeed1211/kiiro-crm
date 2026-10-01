import { requireOperator } from '../../../../../server/operator/auth'
import { previewTenantPlan } from '../../../../../server/operator/provision'
import { failure, success } from '../../../../../server/api/respond'

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  await requireOperator()
  const input = await request.json().catch(() => undefined)
  if (typeof input !== 'object' || input === null) return failure('VALIDATION', 'Invalid tenant input.')
  try {
    const values = input as Record<string, unknown>
    if (typeof values.slug !== 'string' || typeof values.displayName !== 'string')
      return failure('VALIDATION', 'Slug and display name are required.')
    return success(previewTenantPlan({ slug: values.slug, displayName: values.displayName }))
  } catch (error) {
    return failure('VALIDATION', error instanceof Error ? error.message : 'Invalid tenant input.')
  }
}
