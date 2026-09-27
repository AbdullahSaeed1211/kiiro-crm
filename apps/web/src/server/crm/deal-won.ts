import { asId, createJsonLogger, systemClock } from '@ops/kernel'
import type { CrmRepository, DealRecord } from '@ops/module-crm'
import { createProject, createTask, playbookPlan, playbooksSchema, type WorkDeps } from '@ops/module-work'
import type { Payload, PayloadRequest } from 'payload'

const logger = createJsonLogger()

/** What the playbook runner needs; passed in by the composition root so this file does not import it. */
export interface DealWonDeps {
  readonly payload: Payload
  readonly req: PayloadRequest
  readonly crm: CrmRepository
  readonly work: () => Promise<WorkDeps>
}

async function wonPlaybook(deps: DealWonDeps) {
  const settings = await deps.payload.findGlobal({ slug: 'settings', depth: 0, req: deps.req })
  const parsed = playbooksSchema.safeParse(Reflect.get(settings, 'playbooks') ?? [])
  return parsed.success ? parsed.data.find((playbook) => playbook.onDealWon) : undefined
}

async function run(deps: DealWonDeps, deal: DealRecord): Promise<void> {
  const { playbookProjectId } = deal.customData
  if (typeof playbookProjectId === 'string') return
  const playbook = await wonPlaybook(deps)
  if (playbook === undefined) return
  const work = await deps.work()
  const plan = playbookPlan(playbook, deal, systemClock.now())
  const project = await createProject(work, plan.project)
  if (!project.ok) {
    logger.warn('playbook project not created', { dealId: deal.id, code: project.error.code })
    return
  }
  for (const task of plan.tasks) await createTask(work, { ...task, projectId: project.value.id })
  const customData = { ...deal.customData, playbookProjectId: project.value.id }
  await deps.crm.update('deal', asId(deal.id), { customData }, deal.updatedAt)
}

/**
 * Creates the onboarding project for a won deal from the tenant's "run when a deal is won" playbook, once per
 * deal. Failures are logged and never undo the stage move.
 */
export function dealWonPlaybook(deps: DealWonDeps): (deal: DealRecord) => Promise<void> {
  return async (deal) => {
    try {
      await run(deps, deal)
    } catch (error) {
      logger.error('playbook failed', {
        dealId: deal.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
