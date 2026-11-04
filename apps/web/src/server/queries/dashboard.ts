import type { RequestContext } from '@/server/container'
import { getWorkspaceSettings } from '../auth/context'

/** Completed work still makes a workspace established; a quiet queue is not a first-run state. */
export async function hasDashboardRecords(context: RequestContext): Promise<boolean> {
  const settings = await getWorkspaceSettings()
  const modules = settings.modules as Record<string, boolean> | null
  // Most likely to hold something first, so an established workspace stops after one query instead of six.
  const collections = [
    ...(modules?.work === false ? [] : (['tasks', 'projects'] as const)),
    ...(modules?.crm === false ? [] : (['organizations', 'leads', 'contacts', 'deals'] as const)),
  ]
  for (const collection of collections) {
    const { totalDocs } = await context.payload.count({ collection, overrideAccess: false, req: context.req })
    if (totalDocs > 0) return true
  }
  return false
}
