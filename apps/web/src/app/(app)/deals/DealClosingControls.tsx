'use client'

import { Button } from '@ops/ui/components/ui/button'
import type { StageOption } from '@ops/ui/composites/StagePill'
import type { DealActionResult } from '../../../server/crm/deals/actions'
import { moveDealAction } from '../../../server/crm/deals/actions'

type Deal = Readonly<{ id: string; updatedAt: number }>

function ClosingActions({
  deal,
  won,
  reopen,
  pending,
  run,
  onMarkLost,
}: Readonly<{
  deal: Deal
  won: StageOption | undefined
  reopen: StageOption | undefined
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
          Mark won
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
          Reopen
        </Button>
      )}
      {!reopen && !won ? null : (
        <Button variant="destructive" onClick={onMarkLost} disabled={pending}>
          Mark lost
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
}: Readonly<{
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
      <ClosingActions deal={deal} won={won} reopen={reopen} pending={pending} run={run} onMarkLost={onMarkLost} />
    </div>
  )
}
