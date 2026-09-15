'use client'

import { useState, type ReactElement } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ops/ui/components/ui/alert-dialog'
import { cn } from '@ops/ui/lib/utils'

export type ConfirmDialogLabels = Readonly<{
  cancel: string
  confirm: string
  confirming: string
}>

export type ConfirmDialogProps = Readonly<{
  title: string
  description?: string
  labels: ConfirmDialogLabels
  onConfirm: () => void | Promise<void>
  trigger?: ReactElement
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  destructive?: boolean
  className?: string | undefined
}>

/** Confirmation dialog for destructive or otherwise consequential actions. */
export function ConfirmDialog({
  title,
  description,
  labels,
  onConfirm,
  trigger,
  open,
  defaultOpen = false,
  onOpenChange,
  destructive = false,
  className,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [pending, setPending] = useState(false)
  const isOpen = open ?? internalOpen
  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }
  const confirm = async () => {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setPending(false)
    }
  }
  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {trigger === undefined ? null : <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent className={cn(className)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description === undefined ? null : <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{labels.cancel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              void confirm()
            }}
          >
            {pending ? labels.confirming : labels.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
