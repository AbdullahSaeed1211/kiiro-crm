'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import Script from 'next/script'
import { useState, type SyntheticEvent } from 'react'
import { visibleFormFields, checkedFormAnswers, type FormField } from '@ops/module-intake'
import { BookingInstant } from './booking-instant'
import type { Locale } from '../../../../i18n/locale'
import { INTAKE_BOOKING_COPY } from '../../../../i18n/intake-booking-copy'

type Field = FormField
type Presentation = Readonly<{ timeZone: string; locale: Locale }>

function TurnstileWidget({ siteKey }: Readonly<{ siteKey: string }>) {
  if (siteKey === '') return null
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-action="intake" />
    </>
  )
}

/** The input for one question, chosen by its type and named by its key. */
function Control({ field, id }: Readonly<{ field: Field; id: string }>) {
  if (field.type === 'textarea')
    return <Textarea id={id} name={field.key} required={field.required} maxLength={2000} className="min-h-28" />
  if (field.type === 'select')
    return (
      <NativeSelect id={id} name={field.key} required={field.required} className="w-full">
        <option value="">Choose…</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
    )
  return (
    <Input
      id={id}
      name={field.key}
      type={field.type === 'phone' ? 'tel' : field.type}
      required={field.required}
      maxLength={300}
    />
  )
}

/** One question with its label. */
function Question({ field, timeZone, locale }: Readonly<{ field: Field }> & Presentation) {
  const id = `q-${field.key}`
  if (field.type === 'datetime')
    return (
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">
          {field.label}
          {field.required ? ' *' : ''}
        </legend>
        <BookingInstant name={field.key} timeZone={timeZone} locale={locale} />
      </fieldset>
    )
  if (field.type === 'checkbox')
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={field.key} required={field.required} />
        {field.label}
      </label>
    )
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? ' *' : ''}
      </Label>
      <Control field={field} id={id} />
    </div>
  )
}

/** Reads the answers by question key; a ticked checkbox sends "yes". */
function answersOf(form: HTMLFormElement, fields: readonly Field[]): Record<string, string | number> {
  const data = new FormData(form)
  const token = data.get('cf-turnstile-response')
  const answers = fields.flatMap((field): [string, string | number][] => {
    const value = data.get(field.key)
    if (field.type === 'checkbox') return value === null ? [] : [[field.key, 'yes']]
    if (field.type === 'datetime') return typeof value === 'string' && value !== '' ? [[field.key, Number(value)]] : []
    return typeof value === 'string' && value.trim() !== '' ? [[field.key, value.trim()]] : []
  })
  return Object.fromEntries(
    typeof token === 'string' && token !== '' ? [...answers, ['cf-turnstile-response', token]] : answers,
  )
}

/** The public form: shows the questions, posts the answers to the intake endpoint, then shows the success message. */
export function HostedForm({
  formKey,
  title,
  fields,
  successMessage,
  siteKey,
  timeZone = 'UTC',
  locale = 'en',
}: Readonly<{
  formKey: string
  title: string
  fields: readonly Field[]
  successMessage: string
  siteKey: string
  timeZone?: string
  locale?: Locale
}>) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const visible = visibleFormFields(fields, values)
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const answers = checkedFormAnswers(fields, answersOf(form, visible))
    if (answers === undefined) {
      setError(INTAKE_BOOKING_COPY[locale].invalid)
      return
    }
    setState('sending')
    setError(null)
    try {
      const response = await fetch(`/api/v1/intake/${formKey}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(answers),
      })
      if (!response.ok) throw new Error('Could not send. Please check your answers and try again.')
      setState('done')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not send. Please try again.')
      setState('idle')
    }
  }
  if (state === 'done')
    return (
      <p role="status" className="rounded-lg border bg-muted/30 p-4 text-sm">
        {successMessage}
      </p>
    )
  return (
    <form
      className="grid gap-4"
      onChange={(event) => {
        const target = event.target
        if (target instanceof HTMLSelectElement) setValues((current) => ({ ...current, [target.name]: target.value }))
      }}
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <h1 className="text-xl font-semibold">{title}</h1>
      {visible.map((field) => (
        <Question key={field.key} field={field} timeZone={timeZone} locale={locale} />
      ))}
      <TurnstileWidget siteKey={siteKey} />
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send'}
      </Button>
    </form>
  )
}
