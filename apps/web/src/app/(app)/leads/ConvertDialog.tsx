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
import { useState } from 'react'
import { convertLead } from '../../../server/crm/leads/actions'
import type { LeadPageData } from '../../../server/crm/leads/types'

type DialogProps = Readonly<{
  data: LeadPageData
  currency: string
  open: boolean
  onOpenChange: (open: boolean) => void
}>

function ConvertFields(
  props: Readonly<{
    organization: string
    dealTitle: string
    value: string
    currency: string
    onOrganization: (value: string) => void
    onDealTitle: (value: string) => void
    onValue: (value: string) => void
  }>,
) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="convert-org">New organization</Label>
        <Input
          id="convert-org"
          value={props.organization}
          onChange={(event) => {
            props.onOrganization(event.target.value)
          }}
          placeholder="Leave blank for no organization"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="convert-deal">Deal title</Label>
        <Input
          id="convert-deal"
          value={props.dealTitle}
          onChange={(event) => {
            props.onDealTitle(event.target.value)
          }}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="convert-value">Deal value ({props.currency})</Label>
        <Input
          id="convert-value"
          type="number"
          min="0"
          step="0.01"
          value={props.value}
          onChange={(event) => {
            props.onValue(event.target.value)
          }}
          placeholder="0.00"
        />
      </div>
    </div>
  )
}

function ConvertFooter(props: Readonly<{ pending: boolean; onCancel: () => void; onSubmit: () => void }>) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={props.onCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={props.pending} onClick={props.onSubmit}>
        {props.pending ? 'Converting…' : 'Convert lead'}
      </Button>
    </DialogFooter>
  )
}

export function ConvertDialog(props: DialogProps) {
  const router = useRouter()
  const lead = props.data.item.lead
  const [organization, setOrganization] = useState('')
  const [dealTitle, setDealTitle] = useState(lead.title)
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const submit = async () => {
    setError(undefined)
    setPending(true)
    const result = await convertLead({
      leadId: lead.id,
      expectedUpdatedAt: lead.updatedAt,
      organization: organization.trim() ? { create: { name: organization.trim() } } : null,
      contact: { create: true },
      deal: {
        title: dealTitle.trim() || undefined,
        value: value.trim() ? { amountMinor: Math.round(Number(value) * 100), currency: props.currency } : null,
      },
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
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert lead</DialogTitle>
          <DialogDescription>Create a contact and deal from this lead. Organization is optional.</DialogDescription>
        </DialogHeader>
        <ConvertFields
          organization={organization}
          dealTitle={dealTitle}
          value={value}
          currency={props.currency}
          onOrganization={setOrganization}
          onDealTitle={setDealTitle}
          onValue={setValue}
        />
        {error === undefined ? null : (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <ConvertFooter
          pending={pending}
          onCancel={() => {
            props.onOpenChange(false)
          }}
          onSubmit={() => {
            void submit()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
