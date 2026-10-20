'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'
import { StageSelect } from '@ops/ui'
import type { StageOption } from '@ops/ui/composites/StagePill'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../use-guarded-transition'
import type { DealActionResult } from '../../../server/crm/deals/actions'
import { moveDealAction, updateDealAction } from '../../../server/crm/deals/actions'
import { ClosingControls } from './DealClosingControls'
import { ContactPicker } from './DealContactPicker'
import { DEAL_CONTROLS_COPY, type DealControlsCopy } from '../../../i18n/deal-controls-copy'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'

type Contact = Readonly<{ id: string; name: string }>
type Deal = Readonly<{
  id: string
  updatedAt: number
  stageId: string
  value: { amountMinor: number; currency: string } | null
  expectedCloseAt: number | null
  contactIds: readonly string[]
  primaryContactId: string | null
}>

function useDealAction() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setError)
  const run = (task: () => Promise<DealActionResult>, onFailure?: () => void) => {
    startTransition(async () => {
      const result = await task()
      if (!result.ok) {
        setError(result.error.message)
        onFailure?.()
        router.refresh()
      } else {
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
  run: (task: () => Promise<DealActionResult>, onFailure?: () => void) => void
  copy: DealControlsCopy
}>

function StagePicker({
  deal,
  stages,
  pending,
  setError,
  run,
  copy,
}: ActionProps & Readonly<{ stages: readonly StageOption[] }>) {
  function changeStage(stageId: string) {
    const destination = stages.find((stage) => stage.id === stageId)
    if (destination?.category === 'done_failure') {
      setError(copy.useMarkLost)
      return
    }
    run(
      () => moveDealAction({ dealId: deal.id, toStageId: stageId, expectedUpdatedAt: deal.updatedAt }),
      () => {
        // rollback handled by parent
      },
    )
  }
  return (
    <div className="grid gap-2">
      <StageSelect
        stages={stages}
        value={deal.stageId}
        onChange={changeStage}
        labels={{ label: copy.stage, terminalGroup: copy.closedGroup, placeholder: copy.selectStage }}
        disabled={pending}
      />
    </div>
  )
}

function ValueEditor({ deal, currency, pending, setError, run, copy }: ActionProps & Readonly<{ currency: string }>) {
  const [value, setValue] = useState(deal.value === null ? '' : String(deal.value.amountMinor / 100))
  function save() {
    const amountMinor = value.trim() === '' ? null : Math.round(Number(value) * 100)
    if (amountMinor !== null && !Number.isFinite(amountMinor)) {
      setError(copy.invalidValue)
      return
    }
    run(
      () =>
        updateDealAction({
          id: deal.id,
          expectedUpdatedAt: deal.updatedAt,
          patch: { value: amountMinor === null ? null : { amountMinor, currency: deal.value?.currency ?? currency } },
        }),
      () => {
        setValue(deal.value === null ? '' : String(deal.value.amountMinor / 100))
      },
    )
  }
  return (
    <div className="grid gap-2">
      <Label htmlFor="deal-value-detail">{copy.value.replace('{currency}', deal.value?.currency ?? currency)}</Label>
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
          {copy.save}
        </Button>
      </div>
    </div>
  )
}

const dayOf = (epoch: number | null): string => (epoch === null ? '' : new Date(epoch).toISOString().slice(0, 10))

function ExpectedCloseEditor({ deal, pending, setError, run, copy }: ActionProps) {
  const [day, setDay] = useState(dayOf(deal.expectedCloseAt))
  function save() {
    const epoch = day === '' ? null : new Date(`${day}T00:00:00Z`).getTime()
    if (epoch !== null && !Number.isFinite(epoch)) {
      setError(copy.invalidDate)
      return
    }
    run(
      () => updateDealAction({ id: deal.id, expectedUpdatedAt: deal.updatedAt, patch: { expectedCloseAt: epoch } }),
      () => {
        setDay(dayOf(deal.expectedCloseAt))
      },
    )
  }
  return (
    <div className="grid gap-2">
      <Label htmlFor="deal-close-detail">{copy.expectedClose}</Label>
      <div className="flex gap-2">
        <Input
          id="deal-close-detail"
          type="date"
          value={day}
          onChange={(event) => {
            setDay(event.target.value)
          }}
        />
        <Button size="sm" variant="outline" onClick={save} disabled={pending}>
          {copy.saveDate}
        </Button>
      </div>
    </div>
  )
}

export function DealControls({
  deal,
  stages,
  contacts,
  stageCategory,
  currency,
  onMarkLost,
}: Readonly<{
  deal: Deal
  stages: readonly StageOption[]
  contacts: readonly Contact[]
  stageCategory: string
  currency: string
  onMarkLost: () => void
}>) {
  const copy = catalogFor(DEAL_CONTROLS_COPY, useLocale())
  const { pending, error, setError, run } = useDealAction()
  return (
    <div className="grid gap-5">
      <StagePicker
        key={deal.stageId}
        deal={deal}
        stages={stages}
        pending={pending}
        setError={setError}
        run={run}
        copy={copy}
      />
      <ValueEditor deal={deal} currency={currency} pending={pending} setError={setError} run={run} copy={copy} />
      <ExpectedCloseEditor deal={deal} pending={pending} setError={setError} run={run} copy={copy} />
      <ContactPicker deal={deal} contacts={contacts} pending={pending} run={run} />
      <ClosingControls
        deal={deal}
        stages={stages}
        stageCategory={stageCategory}
        pending={pending}
        run={run}
        onMarkLost={onMarkLost}
        copy={copy}
      />
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
