'use client'
/* eslint-disable @typescript-eslint/no-confusing-void-expression */

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { SearchableSelect } from './searchable-select'
import type { CurrencyOption } from '../../../i18n/currencies'
import type { ActionResult } from '../../../server/action-result'
import { settingText } from '../../../i18n/settings-form-copy'
import { useLocale } from '../../../i18n/locale-context'

type Action = (input: unknown) => Promise<ActionResult>

interface Field {
  name: string
  label: string
  type?: 'text' | 'number' | 'email' | 'select'
  searchable?: boolean
  options?: readonly CurrencyOption[]
}

function FieldControl({
  field,
  value,
  onChange,
  locale,
}: Readonly<{ field: Field; value: string; onChange: (value: string) => void; locale: 'en' | 'es' }>) {
  if (field.type === 'select' && field.searchable === true)
    return (
      <SearchableSelect
        id={`setting-${field.name}`}
        label={settingText(field.label, locale)}
        options={field.options ?? []}
        value={value}
        onChange={onChange}
      />
    )
  if (field.type === 'select')
    return (
      <NativeSelect name={field.name} onChange={(event) => onChange(event.target.value)} value={value}>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {settingText(option.label, locale)}
          </option>
        ))}
      </NativeSelect>
    )
  return (
    <input
      className="h-10 rounded-md border bg-background px-3 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      name={field.name}
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
      type={field.type ?? 'text'}
      value={value}
    />
  )
}

export function SettingsActionForm({
  action,
  fields,
  fixedValues = {},
  initialValues = {},
  submitLabel,
}: Readonly<{
  action: Action
  fields: readonly Field[]
  fixedValues?: Readonly<Record<string, unknown>>
  initialValues?: Readonly<Record<string, string | number>>
  submitLabel: string
}>) {
  const router = useRouter()
  const locale = useLocale()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((field) => [field.name, String(initialValues[field.name] ?? '')])),
  )
  const [result, setResult] = useState<ActionResult | undefined>()
  const [pending, setPending] = useState(false)
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setResult(undefined)
    try {
      const response = await action({ ...fixedValues, ...values })
      setResult(response)
      if (response.ok) router.refresh()
    } catch {
      setResult({ ok: false, error: { code: 'INTERNAL', message: "We couldn't save your changes. Please try again." } })
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {fields.map((field) => (
        <label className="grid gap-1 text-sm" key={field.name}>
          <span className="font-medium">{settingText(field.label, locale)}</span>
          <FieldControl
            field={field}
            value={values[field.name] ?? ''}
            locale={locale}
            onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
          />
        </label>
      ))}
      {result?.ok === false && (
        <p className="text-sm text-destructive" role="alert">
          {result.error.message}
        </p>
      )}
      {result?.ok === true && (
        <p className="text-sm text-muted-foreground" role="status">
          {settingText('Saved', locale)}
        </p>
      )}
      <Button className="h-10 px-4" disabled={pending} type="submit">
        {pending ? settingText('Saving…', locale) : settingText(submitLabel, locale)}
      </Button>
    </form>
  )
}
