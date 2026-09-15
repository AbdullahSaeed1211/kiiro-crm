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
import { useState, useTransition } from 'react'
import { createDealAction } from '../../../server/crm/deals/actions'

type Option = Readonly<{ id: string; name: string }>
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
function readForm(form: HTMLFormElement): CreateInput | { error: string } {
  const data = new FormData(form)
  const value = field(data, 'value').trim()
  const amountMinor = value === '' ? null : Math.round(Number(value) * 100)
  if (amountMinor !== null && !Number.isFinite(amountMinor)) return { error: 'Enter a valid deal value.' }
  const close = field(data, 'expectedCloseAt')
  return {
    title: field(data, 'title'),
    organizationId: field(data, 'organizationId') || null,
    primaryContactId: field(data, 'primaryContactId') || null,
    amountMinor,
    expectedCloseAt: close === '' ? null : new Date(close).getTime(),
  }
}

function DealFields({
  organizations,
  contacts,
}: Readonly<{ organizations: readonly Option[]; contacts: readonly Option[] }>) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="deal-title">Title</Label>
        <Input id="deal-title" name="title" required maxLength={300} placeholder="Website redesign" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-organization">Organization</Label>
        <select
          id="deal-organization"
          name="organizationId"
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">No organization</option>
          {organizations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-contact">Primary contact</Label>
        <select
          id="deal-contact"
          name="primaryContactId"
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">No contact</option>
          {contacts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="deal-value">Value</Label>
          <Input id="deal-value" name="value" inputMode="decimal" placeholder="12000" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deal-close">Expected close</Label>
          <Input id="deal-close" name="expectedCloseAt" type="date" />
        </div>
      </div>
    </>
  )
}

export function DealCreateDialog({
  organizations,
  contacts,
}: Readonly<{ organizations: readonly Option[]; contacts: readonly Option[] }>) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  function submit(form: HTMLFormElement) {
    const input = readForm(form)
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
        value: input.amountMinor === null ? null : { amountMinor: input.amountMinor, currency: 'USD' },
        expectedCloseAt: input.expectedCloseAt,
        ownerId: null,
        assigneeIds: [],
        sourceLeadId: null,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      form.reset()
      setError(null)
      setOpen(false)
    })
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New deal</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create deal</DialogTitle>
          <DialogDescription>Add an opportunity to the sales pipeline.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit(event.currentTarget)
          }}
        >
          <DealFields organizations={organizations} contacts={contacts} />
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
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
