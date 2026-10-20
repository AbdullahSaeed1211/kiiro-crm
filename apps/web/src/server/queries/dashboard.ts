import type { RequestContext } from '@/server/container'
import { getWorkspaceSettings } from '../auth/context'

/** Completed work still makes a workspace established; a quiet queue is not a first-run state. */
export async function hasDashboardRecords(context: RequestContext): Promise<boolean> {
  const settings = await getWorkspaceSettings()
  const modules = settings.modules as Record<string, boolean> | null
  const collections = [
    ...(modules?.crm === false ? [] : (['organizations', 'contacts', 'leads', 'deals'] as const)),
    ...(modules?.work === false ? [] : (['projects', 'tasks'] as const)),
  ]
  const counts = await Promise.all(
    collections.map((collection) => context.payload.count({ collection, overrideAccess: false, req: context.req })),
  )
  return counts.some((result) => result.totalDocs > 0)
}
