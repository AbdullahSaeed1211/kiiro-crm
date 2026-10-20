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
export function loadBoardTasks(
  context: RequestContext,
  workflow: Workflow,
  filter: Readonly<{ mine?: boolean; assignee?: string }> = {},
) {
  const open = boardWhere(workflow)
  const people = [
    ...(filter.mine === true ? [String(context.actor.id)] : []),
    ...(filter.assignee === undefined || filter.assignee === '' ? [] : [filter.assignee]),
  ]
  const where: Where =
    people.length === 0 ? open : { and: [open, ...people.map((id) => ({ assignees: { in: [id] } }))] }
  return listTaskPage(context.req, { where, sort: ['rank', 'id'], page: 1, limit: BOARD_LIMIT })
}
