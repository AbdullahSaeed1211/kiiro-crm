import { asId } from '@ops/kernel'
import { nextMonthlyDesignCycle } from '@ops/module-work'
import type { MonthlyDesignConfig } from '@ops/module-work'
import { isManagerUp } from '@ops/platform'
import { getWorkspaceSettings } from '@/server/auth/context'
import { getRequestContext, workCommandDeps } from '@/server/container'

export interface ProjectMonthlyDesignView {
  readonly config: MonthlyDesignConfig | null
  readonly updatedAt: number
  readonly canManage: boolean
  readonly people: readonly { readonly id: string; readonly name: string }[]
  readonly preview: { readonly issueAt: number; readonly dueAt: number } | null
}

function previewFor(config: MonthlyDesignConfig | null, now: number, timeZone: string) {
  if (config?.enabled !== true) return null
  const cycle = nextMonthlyDesignCycle(config, now, timeZone)
  return { issueAt: cycle.issueAt, dueAt: cycle.dueAt }
}

/** Reads the monthly design setup using the same project scope as project detail. */
export async function loadProjectMonthlyDesign(projectId: string): Promise<ProjectMonthlyDesignView | undefined> {
  const context = await getRequestContext()
  const deps = await workCommandDeps(context)
  const project = await deps.repo.getProject(asId(projectId))
  if (project === undefined) return undefined

  const eligibleIds = [...new Set([project.ownerId, ...project.memberIds].filter((id) => id !== null))]
  const canManage = isManagerUp(context.actor)
  const [settings, peopleResult] = await Promise.all([
    getWorkspaceSettings(),
    !canManage || eligibleIds.length === 0
      ? Promise.resolve({ docs: [] as { readonly id: string; readonly name: string }[] })
      : context.payload.find({
          collection: 'users',
          where: { and: [{ id: { in: eligibleIds } }, { active: { equals: true } }] },
          select: { id: true, name: true },
          limit: eligibleIds.length,
          pagination: false,
          depth: 0,
          overrideAccess: false,
          req: context.req,
        }),
  ])
  const timeZone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const people = peopleResult.docs.map(({ id, name }) => ({ id, name }))
  const config = project.monthlyDesign
  return {
    config,
    updatedAt: project.updatedAt,
    canManage,
    people,
    preview: previewFor(config, Date.now(), timeZone),
  }
}
