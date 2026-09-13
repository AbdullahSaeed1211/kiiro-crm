'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { DealActionResult } from '../../../server/crm/deals/actions'
import { moveDealAction, updateDealAction } from '../../../server/crm/deals/actions'
import { ClosingControls } from './DealClosingControls'

type Stage = Readonly<{ id: string; name: string; category: string }>
type Contact = Readonly<{ id: string; name: string }>
type Deal = Readonly<{
  id: string
  updatedAt: number
  stageId: string
  value: { amountMinor: number; currency: string } | null
  contactIds: readonly string[]
  primaryContactId: string | null
}>

function useDealAction() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (task: () => Promise<DealActionResult>) => {
    startTransition(async () => {
      const result = await task()
      if (!result.ok) setError(result.message)
      else {
        setError(null)
        router.refresh()
      }
    })
  }
  return { pending, error, setError, run }
}

type ActionProps = Readonly<{
  deal: Deal
  pending: boolean
  setError: (value: string) => void
  run: (task: () => Promise<DealActionResult>) => void
}>

function StagePicker({ deal, stages, pending, setError, run }: ActionProps & Readonly<{ stages: readonly Stage[] }>) {
  function changeStage(stageId: string) {
    const destination = stages.find((stage) => stage.id === stageId)
    if (destination?.category === 'done_failure') {
      setError('Choose a lost reason and use Mark lost to close this deal.')
      return
    }
    run(() => moveDealAction({ dealId: deal.id, toStageId: stageId, expectedUpdatedAt: deal.updatedAt }))
  }
  return (
    <div className="grid gap-2">
      <Label htmlFor="deal-stage">Stage</Label>
      <select
        id="deal-stage"
        defaultValue={deal.stageId}
        onChange={(event) => {
          changeStage(event.target.value)
        }}
        disabled={pending}
        className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function ValueEditor({ deal, pending, setError, run }: ActionProps) {
  const [value, setValue] = useState(deal.value === null ? '' : String(deal.value.amountMinor / 100))
  function save() {
    const amountMinor = value.trim() === '' ? null : Math.round(Number(value) * 100)
    if (amountMinor !== null && !Number.isFinite(amountMinor)) {
      setError('Enter a valid deal value.')
      return
    }
    run(() =>
      updateDealAction({
        id: deal.id,
        expectedUpdatedAt: deal.updatedAt,
        patch: { value: amountMinor === null ? null : { amountMinor, currency: deal.value?.currency ?? 'USD' } },
      }),
    )
  }
  return (
    <div className="grid gap-2">
      <Label htmlFor="deal-value-detail">Value</Label>
      <div className="flex gap-2">
        <Input
          id="deal-value-detail"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
          }}
          inputMode="decimal"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            save()
          }}
          disabled={pending}
        >
          Save
        </Button>
      </div>
    </div>
  )
}

function ContactPicker({ deal, contacts, pending, run }: ActionProps & Readonly<{ contacts: readonly Contact[] }>) {
  const [selected, setSelected] = useState<readonly string[]>(deal.contactIds)
  const [primary, setPrimary] = useState<string | null>(deal.primaryContactId)
  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((contactId) => contactId !== id) : [...selected, id]
    setSelected(next)
    const nextPrimary = next.includes(primary ?? '') ? primary : (next[0] ?? null)
    setPrimary(nextPrimary)
    run(() =>
      updateDealAction({
        id: deal.id,
        expectedUpdatedAt: deal.updatedAt,
        patch: { contactIds: next, primaryContactId: nextPrimary },
      }),
    )
  }
  function makePrimary(id: string) {
    setPrimary(id)
    run(() => updateDealAction({ id: deal.id, expectedUpdatedAt: deal.updatedAt, patch: { primaryContactId: id } }))
  }
  return (
    <div className="grid gap-2">
      <Label>Contacts</Label>
      <div className="grid gap-2 rounded-lg border border-border p-3">
        {contacts.length === 0 ? (
          <span className="text-sm text-muted-foreground">No contacts available.</span>
        ) : (
          contacts.map((contact) => (
            <label key={contact.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(contact.id)}
                onChange={() => {
                  toggle(contact.id)
                }}
                disabled={pending}
              />
              {contact.name}
              <input
                aria-label={`Primary contact: ${contact.name}`}
                type="radio"
                name="primary-contact"
                checked={primary === contact.id}
                onChange={() => {
                  makePrimary(contact.id)
                }}
                disabled={pending || !selected.includes(contact.id)}
              />
            </label>
          ))
        )}
      </div>
    </div>
  )
}

export function DealControls({
  deal,
  stages,
  lostReasons,
  contacts,
}: Readonly<{
  deal: Deal
  stages: readonly Stage[]
  lostReasons: readonly Readonly<{ id: string; name: string }>[]
  contacts: readonly Contact[]
}>) {
  const { pending, error, setError, run } = useDealAction()
  return (
    <div className="grid gap-5">
      <StagePicker deal={deal} stages={stages} pending={pending} setError={setError} run={run} />
      <ValueEditor deal={deal} pending={pending} setError={setError} run={run} />
      <ContactPicker deal={deal} contacts={contacts} pending={pending} setError={setError} run={run} />
      <ClosingControls
        deal={deal}
        stages={stages}
        lostReasons={lostReasons}
        pending={pending}
        setError={setError}
        run={run}
      />
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
