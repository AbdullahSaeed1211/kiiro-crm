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
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { convertLead, markLost } from '../../../server/crm/leads/actions'
import type { LeadPageData } from '../../../server/crm/leads/types'

type DialogProps = Readonly<{ data: LeadPageData; open: boolean; onOpenChange: (open: boolean) => void }>

function ConvertView({
  props,
  organization,
  dealTitle,
  value,
  pending,
  onOrganization,
  onDealTitle,
  onValue,
  onCancel,
  onSubmit,
}: Readonly<{
  props: DialogProps
  organization: string
  dealTitle: string
  value: string
  pending: boolean
  onOrganization: (value: string) => void
  onDealTitle: (value: string) => void
  onValue: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}>) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert lead</DialogTitle>
          <DialogDescription>Create a contact and deal from this lead. Organization is optional.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="convert-org">New organization</Label>
            <Input
              id="convert-org"
              value={organization}
              onChange={(event) => {
                onOrganization(event.target.value)
              }}
              placeholder="Leave blank for no organization"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="convert-deal">Deal title</Label>
            <Input
              id="convert-deal"
              value={dealTitle}
              onChange={(event) => {
                onDealTitle(event.target.value)
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="convert-value">Deal value (USD)</Label>
            <Input
              id="convert-value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(event) => {
                onValue(event.target.value)
              }}
              placeholder="0.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={onSubmit}>
            {pending ? 'Converting…' : 'Convert lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConvertDialog(props: DialogProps) {
  const router = useRouter()
  const lead = props.data.item.lead
  const [organization, setOrganization] = useState('')
  const [dealTitle, setDealTitle] = useState(lead.title)
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const submit = async () => {
    setPending(true)
    const result = await convertLead({
      leadId: lead.id,
      expectedUpdatedAt: lead.updatedAt,
      organization: organization.trim() ? { create: { name: organization.trim() } } : null,
      contact: { create: true },
      deal: {
        title: dealTitle.trim() || undefined,
        value: value.trim() ? { amountMinor: Math.round(Number(value) * 100), currency: 'USD' } : null,
      },
    })
    setPending(false)
    if (result.ok) {
      props.onOpenChange(false)
      router.refresh()
    }
  }
  return (
    <ConvertView
      props={props}
      organization={organization}
      dealTitle={dealTitle}
      value={value}
      pending={pending}
      onOrganization={setOrganization}
      onDealTitle={setDealTitle}
      onValue={setValue}
      onCancel={() => {
        props.onOpenChange(false)
      }}
      onSubmit={() => {
        void submit()
      }}
    />
  )
}

function LostView({
  props,
  reason,
  note,
  pending,
  onReason,
  onNote,
  onCancel,
  onSubmit,
}: Readonly<{
  props: DialogProps
  reason: string
  note: string
  pending: boolean
  onReason: (value: string) => void
  onNote: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}>) {
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
              value={reason}
              onChange={(event) => {
                onReason(event.target.value)
              }}
            >
              {props.data.lostReasons.map((item) => (
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
              value={note}
              onChange={(event) => {
                onNote(event.target.value)
              }}
              placeholder="What happened?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={pending || !reason} onClick={onSubmit}>
            {pending ? 'Saving…' : 'Mark lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LostDialog(props: DialogProps) {
  const router = useRouter()
  const lead = props.data.item.lead
  const [reason, setReason] = useState<string>(props.data.lostReasons[0]?.id ?? '')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const submit = async () => {
    if (!reason) return
    setPending(true)
    const result = await markLost({
      id: lead.id,
      expectedUpdatedAt: lead.updatedAt,
      lostReasonId: reason,
      lostNote: note,
    })
    setPending(false)
    if (result.ok) {
      props.onOpenChange(false)
      router.refresh()
    }
  }
  return (
    <LostView
      props={props}
      reason={reason}
      note={note}
      pending={pending}
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
