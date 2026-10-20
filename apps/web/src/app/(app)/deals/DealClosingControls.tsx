'use client'

import { Button } from '@ops/ui/components/ui/button'
import type { StageOption } from '@ops/ui/composites/StagePill'
import type { DealActionResult } from '../../../server/crm/deals/actions'
import { moveDealAction } from '../../../server/crm/deals/actions'
import type { DealControlsCopy } from '../../../i18n/deal-controls-copy'

type Deal = Readonly<{ id: string; updatedAt: number }>

function ClosingActions({
  deal,
  won,
  reopen,
  lost,
  pending,
  run,
  onMarkLost,
  copy,
}: Readonly<{
  copy: DealControlsCopy
  deal: Deal
  won: StageOption | undefined
  reopen: StageOption | undefined
  /** True when the deal is already lost or cancelled, so Mark lost would do nothing. */
  lost: boolean
  pending: boolean
  run: (task: () => Promise<DealActionResult>, onFailure?: () => void) => void
  onMarkLost: () => void
}>) {
  return (
    <>
      {won === undefined ? null : (
        <Button
          variant="outline"
          onClick={() => {
            run(() => moveDealAction({ dealId: deal.id, toStageId: won.id, expectedUpdatedAt: deal.updatedAt }))
          }}
          disabled={pending}
        >
          {copy.markWon}
        </Button>
      )}
      {reopen === undefined ? null : (
        <Button
          variant="ghost"
          onClick={() => {
            run(() => moveDealAction({ dealId: deal.id, toStageId: reopen.id, expectedUpdatedAt: deal.updatedAt }))
          }}
          disabled={pending}
        >
          {copy.reopen}
        </Button>
      )}
      {lost || (!reopen && !won) ? null : (
        <Button variant="destructive" onClick={onMarkLost} disabled={pending}>
          {copy.markLost}
        </Button>
      )}
    </>
  )
}

export function ClosingControls({
  deal,
  stages,
  stageCategory,
  pending,
  run,
  onMarkLost,
  copy,
}: Readonly<{
  copy: DealControlsCopy
  deal: Deal
  stages: readonly StageOption[]
  stageCategory: string
  pending: boolean
  run: (task: () => Promise<DealActionResult>) => void
  onMarkLost: () => void
}>) {
  const terminal = ['done_success', 'done_failure', 'cancelled'].includes(stageCategory)
  const won = stageCategory === 'done_success' ? undefined : stages.find((stage) => stage.category === 'done_success')
  const reopen = terminal
    ? stages.find((stage) => !['done_success', 'done_failure', 'cancelled'].includes(stage.category))
    : undefined
  return (
    <div className="grid gap-2 border-t border-border pt-4">
      <ClosingActions
        deal={deal}
        won={won}
        reopen={reopen}
        lost={['done_failure', 'cancelled'].includes(stageCategory)}
        pending={pending}
        run={run}
        onMarkLost={onMarkLost}
        copy={copy}
      />
    </div>
  )
}
