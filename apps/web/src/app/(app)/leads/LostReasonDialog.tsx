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
import { Label } from '@ops/ui/components/ui/label'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { markLost } from '../../../server/crm/leads/actions'

export type LostReasonDialogProps = Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  expectedUpdatedAt: number
  lostReasons: readonly { id: string; name: string }[]
}>

function LostReasonDialogView(
  props: Readonly<
    LostReasonDialogProps & {
      reason: string
      note: string
      pending: boolean
      error: string | undefined
      onReason: (value: string) => void
      onNote: (value: string) => void
      onCancel: () => void
      onSubmit: () => void
    }
  >,
) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark lead as lost</DialogTitle>
          <DialogDescription>Choose a reason so the pipeline stays useful.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="lost-reason">Lost reason</Label>
            <select
              id="lost-reason"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              value={props.reason}
              onChange={(event) => {
                props.onReason(event.target.value)
              }}
            >
              {props.lostReasons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lost-note">Note (optional)</Label>
            <Textarea
              id="lost-note"
              value={props.note}
              onChange={(event) => {
                props.onNote(event.target.value)
              }}
              placeholder="What happened?"
            />
          </div>
        </div>
        {props.error === undefined ? null : (
          <p role="alert" className="text-sm text-destructive">
            {props.error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={props.pending || !props.reason}
            onClick={props.onSubmit}
          >
            {props.pending ? 'Saving…' : 'Mark lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LostReasonDialog(props: LostReasonDialogProps) {
  const router = useRouter()
  const [reason, setReason] = useState(props.lostReasons[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const submit = async () => {
    if (!reason) return
    setError(undefined)
    setPending(true)
    const result = await markLost({
      id: props.leadId,
      expectedUpdatedAt: props.expectedUpdatedAt,
      lostReasonId: reason,
      lostNote: note,
    })
    setPending(false)
    if (result.ok) {
      props.onOpenChange(false)
      router.refresh()
    } else {
      setError(result.error.message)
      if (result.error.code === 'CONFLICT') router.refresh()
    }
  }
  return (
    <LostReasonDialogView
      {...props}
      reason={reason}
      note={note}
      pending={pending}
      error={error}
      onReason={setReason}
      onNote={setNote}
      onCancel={() => {
        props.onOpenChange(false)
      }}
      onSubmit={() => {
        void submit()
      }}
    />
  )
}
