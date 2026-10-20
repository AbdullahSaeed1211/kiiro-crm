'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ops/ui/components/ui/dialog'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'
import { useState } from 'react'
import { useGuardedTransition } from '../use-guarded-transition'
import { RecordPicker } from '../RecordPicker'
import { createDealAction } from '../../../server/crm/deals/actions'
import { DEAL_CREATE_COPY, type DealCreateCopy } from '../../../i18n/deal-create-copy'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'

type CreateInput = Readonly<{
  title: string
  organizationId: string | null
  primaryContactId: string | null
  amountMinor: number | null
  expectedCloseAt: number | null
}>

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}
function readForm(form: HTMLFormElement, copy: DealCreateCopy): CreateInput | { error: string } {
  const data = new FormData(form)
  const value = field(data, 'value').trim()
  const amountMinor = value === '' ? null : Math.round(Number(value) * 100)
  if (amountMinor !== null && !Number.isFinite(amountMinor)) return { error: copy.invalidValue }
  const close = field(data, 'expectedCloseAt')
  return {
    title: field(data, 'title'),
    organizationId: field(data, 'organizationId') || null,
    primaryContactId: field(data, 'primaryContactId') || null,
    amountMinor,
    expectedCloseAt: close === '' ? null : new Date(close).getTime(),
  }
}

function DealFields({ currency, copy }: Readonly<{ currency: string; copy: DealCreateCopy }>) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="deal-title">{copy.titleLabel}</Label>
        <Input id="deal-title" name="title" required maxLength={300} placeholder={copy.titlePlaceholder} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-organization">{copy.organization}</Label>
        <RecordPicker
          id="deal-organization"
          name="organizationId"
          type="organization"
          emptyLabel={copy.noOrganization}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-contact">{copy.contact}</Label>
        <RecordPicker id="deal-contact" name="primaryContactId" type="contact" emptyLabel={copy.noContact} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="deal-value">{copy.value.replace('{currency}', currency)}</Label>
          <Input id="deal-value" name="value" inputMode="decimal" placeholder={copy.valuePlaceholder} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deal-close">{copy.expectedClose}</Label>
          <Input id="deal-close" name="expectedCloseAt" type="date" />
        </div>
      </div>
    </>
  )
}

export function DealCreateDialog({ currency }: Readonly<{ currency: string }>) {
  const copy = catalogFor(DEAL_CREATE_COPY, useLocale())
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setError)
  function submit(form: HTMLFormElement) {
    const input = readForm(form, copy)
    if ('error' in input) {
      setError(input.error)
      return
    }
    startTransition(async () => {
      const result = await createDealAction({
        title: input.title,
        organizationId: input.organizationId,
        contactIds: input.primaryContactId === null ? [] : [input.primaryContactId],
        primaryContactId: input.primaryContactId,
        value: input.amountMinor === null ? null : { amountMinor: input.amountMinor, currency },
        expectedCloseAt: input.expectedCloseAt,
        ownerId: null,
        assigneeIds: [],
        sourceLeadId: null,
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      form.reset()
      setError(null)
      setOpen(false)
    })
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{copy.trigger}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit(event.currentTarget)
          }}
        >
          <DealFields currency={currency} copy={copy} />
          {error === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
              }}
            >
              {copy.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? copy.creating : copy.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
