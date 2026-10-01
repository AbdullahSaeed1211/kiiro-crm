import { listTaskPage } from '@ops/adapter-payload'
import type { Workflow } from '@ops/platform'
import type { Where } from 'payload'
import type { RequestContext } from '../../container'
import { BOARD_LIMIT } from '../../crm/board-limit'

const RECENT_DONE_MS = 14 * 86_400_000
const FINISHED = new Set(['done_success', 'done_failure', 'cancelled'])

/** Open tasks, plus ones finished in the last two weeks, so the board shows live work and not the whole history. */
function boardWhere(workflow: Workflow): Where {
  const finished = workflow.stages.filter((stage) => FINISHED.has(stage.category)).map((stage) => stage.id)
  if (finished.length === 0) return {}
  return {
    or: [{ stageId: { not_in: finished } }, { completedAt: { greater_than_equal: Date.now() - RECENT_DONE_MS } }],
  }
}

/** The tasks the board shows (up to the board limit) and how many there are in all. */
export function loadBoardTasks(context: RequestContext, workflow: Workflow) {
  return listTaskPage(context.req, { where: boardWhere(workflow), sort: ['rank', 'id'], page: 1, limit: BOARD_LIMIT })
}
