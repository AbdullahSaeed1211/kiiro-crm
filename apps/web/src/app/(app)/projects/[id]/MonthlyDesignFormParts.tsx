'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { MONTHLY_DESIGN_COPY } from '../../../../i18n/monthly-design-copy'
import type { MonthlyDesignDraft, MonthlyDesignDraftChange, MonthlyDesignPerson } from './monthly-design-form-state'

export function MonthlyDesignFormTitle({
  draft,
  pending,
  onChange,
}: Readonly<{ draft: MonthlyDesignDraft; pending: boolean; onChange: MonthlyDesignDraftChange }>) {
  const copy = catalogFor(MONTHLY_DESIGN_COPY, useLocale())
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium" htmlFor="monthly-design-task-title">
        {copy.titleLabel}
      </label>
      <Input
        id="monthly-design-task-title"
        className="h-9 px-3 text-sm"
        value={draft.title}
        maxLength={200}
        required
        disabled={pending}
        placeholder={copy.titlePlaceholder}
        onChange={(event) => {
          const title = event.currentTarget.value
          onChange((current) => ({ ...current, title }))
        }}
      />
    </div>
  )
}

export function MonthlyDesignFormFields({
  draft,
  people,
  pending,
  onDraftChange,
  onToggle,
}: Readonly<{
  draft: MonthlyDesignDraft
  people: readonly MonthlyDesignPerson[]
  pending: boolean
  onDraftChange: MonthlyDesignDraftChange
  onToggle: (id: string, checked: boolean) => void
}>) {
  return (
    <>
      <DesignerChoices people={people} selectedIds={draft.assigneeIds} pending={pending} onToggle={onToggle} />
      <ActivationControl
        enabled={draft.enabled}
        hasPeople={people.length > 0}
        pending={pending}
        onChange={(enabled) => {
          onDraftChange((current) => ({ ...current, enabled }))
        }}
      />
      <PauseNote enabled={draft.enabled} />
      <TimingFields draft={draft} pending={pending} onChange={onDraftChange} />
    </>
  )
}

export function MonthlyDesignFormMessage({
  fieldError,
  error,
  pending,
  onCancel,
}: Readonly<{ fieldError: string; error: string; pending: boolean; onCancel: () => void }>) {
  const copy = catalogFor(MONTHLY_DESIGN_COPY, useLocale())
  return (
    <>
      {fieldError || error ? (
        <p role="alert" className="text-sm text-destructive">
          {fieldError || error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? copy.saving : copy.save}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          {copy.closeEditor}
        </Button>
      </div>
    </>
  )
}

function DesignerChoices({
  people,
  selectedIds,
  pending,
  onToggle,
}: Readonly<{
  people: readonly MonthlyDesignPerson[]
  selectedIds: readonly string[]
  pending: boolean
  onToggle: (id: string, checked: boolean) => void
}>) {
  const copy = catalogFor(MONTHLY_DESIGN_COPY, useLocale())
  return (
    <fieldset className="grid gap-2" disabled={pending}>
      <legend className="mb-1 text-sm font-medium">{copy.chooseDesigners}</legend>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.noEligibleDesigners}</p>
      ) : (
        people.map((person) => (
          <label key={person.id} className="flex min-h-10 items-center gap-3 text-sm">
            <Checkbox
              checked={selectedIds.includes(person.id)}
              onCheckedChange={(checked) => {
                onToggle(person.id, checked)
              }}
            />
            <span>{person.name}</span>
          </label>
        ))
      )}
    </fieldset>
  )
}

function ActivationControl({
  enabled,
  hasPeople,
  pending,
  onChange,
}: Readonly<{ enabled: boolean; hasPeople: boolean; pending: boolean; onChange: (enabled: boolean) => void }>) {
  const copy = catalogFor(MONTHLY_DESIGN_COPY, useLocale())
  return (
    <label className="flex min-h-10 items-center gap-3 text-sm font-medium">
      <Checkbox
        checked={enabled}
        disabled={pending || (!hasPeople && !enabled)}
        onCheckedChange={(checked) => {
          onChange(checked)
        }}
      />
      {copy.enable}
    </label>
  )
}

function PauseNote({ enabled }: Readonly<{ enabled: boolean }>) {
  const copy = catalogFor(MONTHLY_DESIGN_COPY, useLocale())
  if (enabled) return null
  return <p className="-mt-3 text-sm text-muted-foreground">{copy.pauseNote}</p>
}

function TimingFields({
  draft,
  pending,
  onChange,
}: Readonly<{ draft: MonthlyDesignDraft; pending: boolean; onChange: MonthlyDesignDraftChange }>) {
  const copy = catalogFor(MONTHLY_DESIGN_COPY, useLocale())
  return (
    <details className="group border-t pt-3">
      <summary className="min-h-10 cursor-pointer py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
        {copy.timing}
      </summary>
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <DayField
          id="monthly-design-issue-day"
          label={copy.issueDay}
          value={draft.issueDay}
          disabled={pending}
          onChange={(issueDay) => {
            onChange((current) => ({ ...current, issueDay }))
          }}
        />
        <DayField
          id="monthly-design-due-day"
          label={copy.dueDay}
          value={draft.dueDay}
          disabled={pending}
          onChange={(dueDay) => {
            onChange((current) => ({ ...current, dueDay }))
          }}
        />
        <p className="text-sm text-muted-foreground sm:col-span-2">{copy.monthEndNote}</p>
      </div>
    </details>
  )
}

function DayField({
  id,
  label,
  value,
  disabled,
  onChange,
}: Readonly<{
  id: string
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
}>) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.currentTarget.value)
        }}
        className="h-9 px-3 text-sm"
      />
    </div>
  )
}
