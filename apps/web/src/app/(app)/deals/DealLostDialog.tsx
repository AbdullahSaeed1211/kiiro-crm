'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ops/ui/components/ui/dialog'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { markDealLostAction } from '../../../server/crm/deals/actions'

export interface LostMove {
  readonly cardId: string
  readonly expectedUpdatedAt: number
}

function useLostDealSubmission({
  move,
  reason,
  note,
  onClose,
}: Readonly<{ move: LostMove; reason: string; note: string; onClose: () => void }>) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function submit() {
    if (reason === '') {
      setError('A lost reason is required.')
      return
    }
    startTransition(async () => {
      const result = await markDealLostAction({
        id: move.cardId,
        expectedUpdatedAt: move.expectedUpdatedAt,
        lostReasonId: reason,
        lostNote: note,
      })
      if (!result.ok) {
        setError(result.message)
        router.refresh()
        return
      }
      setError(null)
      onClose()
      router.refresh()
    })
  }
  return { pending, error, submit }
}

function LostDealDialogContent({
  move,
  reasons,
  onClose,
}: Readonly<{
  move: LostMove
  reasons: readonly Readonly<{ id: string; name: string }>[]
  onClose: () => void
}>) {
  const [reason, setReason] = useState(reasons[0]?.id ?? '')
  const [note, setNote] = useState('')
  const { pending, error, submit } = useLostDealSubmission({ move, reason, note, onClose })
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Mark deal lost</DialogTitle>
        <DialogDescription>Choose a reason before moving this deal to Lost.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="board-lost-reason">Lost reason</Label>
          <select
            id="board-lost-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
            }}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="">Choose a reason</option>
            {reasons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          value={note}
          onChange={(event) => {
            setNote(event.target.value)
          }}
          placeholder="Optional note"
        />
        {error === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            onClose()
          }}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            submit()
          }}
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Mark lost'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function DealLostDialog({
  move,
  reasons,
  onClose,
}: Readonly<{
  move: LostMove | null
  reasons: readonly Readonly<{ id: string; name: string }>[]
  onClose: () => void
}>) {
  return (
    <Dialog
      open={move !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {move === null ? null : <LostDealDialogContent move={move} reasons={reasons} onClose={onClose} />}
    </Dialog>
  )
}
