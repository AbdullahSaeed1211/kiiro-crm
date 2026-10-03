'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { computeTotals, type DocumentKind } from '@ops/module-billing'
import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import { BILLING_COPY, type BillingCopy } from '../../../i18n/billing-copy'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { RecordPicker } from '../RecordPicker'
import { submitBilling } from './submit-billing'
import { LinesEditor } from './lines-editor'
import { EMPTY_LINE, toLines, type LineDraft } from './line-model'
import { formatMoney } from './money'

export interface FormStart {
  readonly kind: DocumentKind
  readonly currency: string
  /** Present when a draft is being edited. */
  readonly edit?: { readonly id: string; readonly expectedUpdatedAt: number; readonly company: string }
  readonly lines?: readonly LineDraft[]
  readonly note?: string
  readonly dueDate?: string
}

const dayStart = (date: string): number | null => (date === '' ? null : Date.parse(`${date}T00:00:00.000Z`))

/** The form's values as the API wants them, or `undefined` when an item is not valid. */
function bodyOf(input: {
  start: FormStart
  organizationId: string
  currency: string
  lines: readonly LineDraft[]
  note: string
  dueDate: string
}) {
  const items = toLines(input.lines, input.currency)
  if (items === undefined) return undefined
  const common = { lines: items, note: input.note.trim(), dueAt: dayStart(input.dueDate) }
  const { edit } = input.start
  if (edit !== undefined) return { expectedUpdatedAt: edit.expectedUpdatedAt, patch: common }
  return {
    kind: input.start.kind,
    organizationId: input.organizationId,
    currency: input.currency,
    ...common,
  }
}

/** Saves through the product API and opens the saved document. */
function useSave(start: FormStart) {
  const router = useRouter()
  const copy = catalogFor(BILLING_COPY, useLocale())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async (body: object | undefined) => {
    setError(body === undefined ? copy.saveFailed : '')
    if (body === undefined) return
    setSaving(true)
    const result = await submitBilling({ editId: start.edit?.id, body, copy })
    if (result.ok) {
      router.push(`/billing/${result.id}`)
      return
    }
    setError(result.message)
    setSaving(false)
  }
  return { save, error, saving, copy }
}

function HeaderFields({
  copy,
  start,
  values,
  on,
}: Readonly<{
  copy: BillingCopy
  start: FormStart
  values: Readonly<{ currency: string; dueDate: string }>
  on: Readonly<{ company: (id: string) => void; currency: (value: string) => void; dueDate: (value: string) => void }>
}>) {
  return (
    <>
      {start.edit === undefined ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{copy.company}</span>
          <RecordPicker
            id="billing-company"
            name="organization"
            type="organization"
            emptyLabel={copy.chooseCompany}
            onChoose={(option) => {
              on.company(option?.id ?? '')
            }}
          />
        </label>
      ) : (
        <p className="text-sm font-medium">{start.edit.company}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{copy.currency}</span>
          <Input
            className="w-24"
            maxLength={3}
            value={values.currency}
            disabled={start.edit !== undefined}
            onChange={(event) => {
              on.currency(event.target.value.toUpperCase())
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{start.kind === 'quote' ? copy.dueQuote : copy.dueInvoice}</span>
          <Input
            type="date"
            value={values.dueDate}
            onChange={(event) => {
              on.dueDate(event.target.value)
            }}
          />
        </label>
      </div>
    </>
  )
}

function initialOf(start: FormStart): { lines: readonly LineDraft[]; note: string; dueDate: string } {
  return { lines: start.lines ?? [EMPTY_LINE], note: start.note ?? '', dueDate: start.dueDate ?? '' }
}

function Summary({
  copy,
  totalMinor,
  currency,
}: Readonly<{ copy: BillingCopy; totalMinor: number | undefined; currency: string }>) {
  const locale = useLocale() === 'es' ? 'es-ES' : 'en-US'
  if (totalMinor === undefined) return null
  return (
    <p className="text-sm tabular-nums" aria-live="polite">
      {copy.total}: <strong>{formatMoney({ minor: totalMinor, currency, locale })}</strong>
    </p>
  )
}

function ErrorLine({ message }: Readonly<{ message: string }>) {
  if (message === '') return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

/** Makes or edits a draft quote or invoice. */
export function BillingForm({ start }: Readonly<{ start: FormStart }>) {
  const { save, error, saving, copy } = useSave(start)
  const initial = initialOf(start)
  const [organizationId, setOrganizationId] = useState('')
  const [currency, setCurrency] = useState(start.currency)
  const [lines, setLines] = useState<readonly LineDraft[]>(initial.lines)
  const [note, setNote] = useState(initial.note)
  const [dueDate, setDueDate] = useState(initial.dueDate)
  const items = toLines(lines, currency)
  const totals = items === undefined ? undefined : computeTotals(items)
  const submit = (event: SyntheticEvent) => {
    event.preventDefault()
    void save(bodyOf({ start, organizationId, currency, lines, note, dueDate }))
  }
  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-4">
      <HeaderFields
        copy={copy}
        start={start}
        values={{ currency, dueDate }}
        on={{ company: setOrganizationId, currency: setCurrency, dueDate: setDueDate }}
      />
      <LinesEditor copy={copy} lines={lines} onChange={setLines} />
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{copy.note}</span>
        <Input
          value={note}
          onChange={(event) => {
            setNote(event.target.value)
          }}
        />
      </label>
      <Summary copy={copy} totalMinor={totals?.totalMinor} currency={currency} />
      <ErrorLine message={error} />
      <Button type="submit" className="w-fit" disabled={saving || (start.edit === undefined && organizationId === '')}>
        {saving ? copy.saving : copy.save}
      </Button>
    </form>
  )
}
