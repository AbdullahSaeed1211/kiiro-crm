'use client'

import { Button } from '@ops/ui/components/ui/button'
import { useState } from 'react'
import { CustomFieldInput } from './field-input'
import type { CustomFieldsLabels, CustomFieldsSaveResult, CustomFieldValue, CustomFieldView } from './types'

export type CustomFieldsCardProps = Readonly<{
  fields: readonly CustomFieldView[]
  values: Readonly<Record<string, CustomFieldValue>>
  canEdit: boolean
  locale: string
  labels: CustomFieldsLabels
  onSave: (values: Readonly<Record<string, CustomFieldValue>>) => Promise<CustomFieldsSaveResult>
}>

type Format = Readonly<{ locale: string; labels: CustomFieldsLabels }>

const isBlank = (value: CustomFieldValue): boolean =>
  value === null || value === '' || (Array.isArray(value) && value.length === 0)

const FORMATTERS: Partial<Record<CustomFieldView['type'], (value: CustomFieldValue, format: Format) => string>> = {
  checkbox: (value, { labels }) => (value === true ? labels.yes : labels.no),
  date: (value, { locale }) =>
    typeof value === 'number'
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(value)
      : String(value),
  currency: (value, { locale }) =>
    typeof value === 'number' ? new Intl.NumberFormat(locale).format(value) : String(value),
}

function displayValue(field: CustomFieldView, { value, ...format }: Format & { value: CustomFieldValue }): string {
  if (isBlank(value)) return format.labels.empty
  const formatter = FORMATTERS[field.type]
  if (formatter !== undefined) return formatter(value, format)
  return Array.isArray(value) ? value.join(', ') : String(value)
}

function useCardEditing(props: CustomFieldsCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, CustomFieldValue>>({})
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})
  const start = () => {
    setDraft({ ...props.values })
    setErrors({})
    setMessage(null)
    setEditing(true)
  }
  const save = async () => {
    setPending(true)
    const changed = Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== props.values[key]))
    const result = await props.onSave(changed)
    setPending(false)
    if (result.ok) {
      setEditing(false)
      return
    }
    setMessage(result.message)
    setErrors(result.fields ?? {})
  }
  return { editing, setEditing, draft, setDraft, pending, message, errors, start, save }
}

/** Tenant-defined fields on a record: read as a list, edited together and saved in one request. */
export function CustomFieldsCard(props: CustomFieldsCardProps) {
  const { fields, values, canEdit, locale, labels } = props
  const card = useCardEditing(props)
  if (fields.length === 0) return null
  return (
    <section aria-label={labels.title} className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{labels.title}</h3>
        {canEdit && !card.editing ? (
          <Button size="sm" variant="ghost" onClick={card.start}>
            {labels.edit}
          </Button>
        ) : null}
      </div>
      <dl className="space-y-2.5 text-sm">
        {fields.map((field) => (
          <div key={field.key} className="grid gap-1">
            <dt className="text-muted-foreground">
              {field.label}
              {field.required && card.editing ? ' *' : ''}
            </dt>
            <dd className="min-w-0 break-words">
              {card.editing ? (
                <CustomFieldInput
                  field={field}
                  value={card.draft[field.key] ?? null}
                  labels={labels}
                  locale={locale}
                  onChange={(value) => {
                    card.setDraft((current) => ({ ...current, [field.key]: value }))
                  }}
                />
              ) : (
                displayValue(field, { value: values[field.key] ?? null, locale, labels })
              )}
              {card.errors[field.key] === undefined ? null : (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {card.errors[field.key]}
                </p>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {card.message === null ? null : (
        <p className="text-sm text-destructive" role="alert">
          {card.message}
        </p>
      )}
      {card.editing ? (
        <div className="flex gap-2">
          <Button size="sm" disabled={card.pending} onClick={() => void card.save()}>
            {card.pending ? labels.saving : labels.save}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={card.pending}
            onClick={() => {
              card.setEditing(false)
            }}
          >
            {labels.cancel}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
