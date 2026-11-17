'use client'

import type { VoiceNumber } from '@ops/module-crm'
import { Button } from '@ops/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ops/ui/components/ui/dialog'
import type { CallingCopy } from '../../../../i18n/calling-copy'
import { price } from './calling-settings-utils'
type Copy = CallingCopy

export function ReleaseDialog({
  number,
  open,
  pending,
  copy,
  onOpenChange,
  onRelease,
  setPending,
}: Readonly<{
  number: VoiceNumber
  open: boolean
  pending: boolean
  copy: Copy
  onOpenChange: (open: boolean) => void
  onRelease: (number: VoiceNumber) => Promise<void>
  setPending: (pending: boolean) => void
}>) {
  const release = async () => {
    setPending(true)
    try {
      await onRelease(number)
    } finally {
      setPending(false)
      onOpenChange(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {copy.release} {number.e164}?
          </DialogTitle>
          <DialogDescription>
            {copy.release} · {copy.monthly}: {price(number.monthlyCost)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {copy.close}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              void release()
            }}
          >
            {copy.release}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
