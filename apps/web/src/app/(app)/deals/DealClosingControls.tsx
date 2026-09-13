'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'
import { useState } from 'react'
import type { DealActionResult } from '../../../server/crm/deals/actions'
import { markDealLostAction, moveDealAction } from '../../../server/crm/deals/actions'

type Stage = Readonly<{ id: string; name: string; category: string }>
type Deal = Readonly<{ id: string; updatedAt: number }>

function ClosingActions({
  deal,
  won,
  reopen,
  pending,
  run,
}: Readonly<{
  deal: Deal
  won: Stage | undefined
  reopen: Stage | undefined
  pending: boolean
  run: (task: () => Promise<DealActionResult>) => void
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
    </>
  )
}

export function ClosingControls({
  deal,
  stages,
  lostReasons,
  pending,
  setError,
  run,
}: Readonly<{
  deal: Deal
  stages: readonly Stage[]
  lostReasons: readonly Readonly<{ id: string; name: string }>[]
  pending: boolean
  setError: (value: string) => void
  run: (task: () => Promise<DealActionResult>) => void
}>) {
  const [reason, setReason] = useState(lostReasons[0]?.id ?? '')
  const [note, setNote] = useState('')
  const won = stages.find((stage) => stage.category === 'done_success')
  const reopen = stages.find((stage) => !['done_success', 'done_failure', 'cancelled'].includes(stage.category))
  function markLost() {
    if (reason === '') {
      setError('A lost reason is required.')
      return
    }
    run(() =>
      markDealLostAction({ id: deal.id, expectedUpdatedAt: deal.updatedAt, lostReasonId: reason, lostNote: note }),
    )
  }
  return (
    <div className="grid gap-2 border-t border-border pt-4">
      <Label htmlFor="lost-reason">Lost reason</Label>
      <select
        id="lost-reason"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value)
        }}
        className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
      >
        <option value="">Choose a reason</option>
        {lostReasons.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <Input
        value={note}
        onChange={(event) => {
          setNote(event.target.value)
        }}
        placeholder="Optional note"
      />
      <Button
        variant="destructive"
        onClick={() => {
          markLost()
        }}
        disabled={pending}
      >
        Mark lost
      </Button>
      <ClosingActions deal={deal} won={won} reopen={reopen} pending={pending} run={run} />
    </div>
  )
}
