'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
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
import { useState } from 'react'
import { useVersionedAction } from './use-versioned-action'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { LOST_REASON_COPY } from '../../i18n/lost-reason-copy'

type LostResult = Readonly<{ ok: true }> | Readonly<{ ok: false; error: Readonly<{ code: string; message: string }> }>

export type LostReasonDialogProps = Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  recordId: string
  /** Which kind of record is being marked lost; picks the translated title. */
  noun: 'lead' | 'deal'
  markLost: (input: {
    id: string
    expectedUpdatedAt: number
    lostReasonId: string
    lostNote: string
  }) => Promise<LostResult>
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
  const copy = catalogFor(LOST_REASON_COPY, useLocale())
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{props.noun === 'lead' ? copy.titleLead : copy.titleDeal}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="lost-reason">{copy.reasonLabel}</Label>
            <NativeSelect
              id="lost-reason"
              className="w-full"
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
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lost-note">{copy.noteLabel}</Label>
            <Textarea
              id="lost-note"
              value={props.note}
              onChange={(event) => {
                props.onNote(event.target.value)
              }}
              placeholder={copy.notePlaceholder}
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
            {copy.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={props.pending || !props.reason}
            onClick={props.onSubmit}
          >
            {props.pending ? copy.saving : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LostReasonDialog(props: LostReasonDialogProps) {
  const [reason, setReason] = useState(props.lostReasons[0]?.id ?? '')
  const [note, setNote] = useState('')
  const { run, error, pending } = useVersionedAction({ refreshOnSuccess: true })
  const submit = async () => {
    if (!reason) return
    const saved = await run(() =>
      props.markLost({
        id: props.recordId,
        expectedUpdatedAt: props.expectedUpdatedAt,
        lostReasonId: reason,
        lostNote: note,
      }),
    )
    if (saved !== null) props.onOpenChange(false)
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
