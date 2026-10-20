'use client'

import { RecordForm, type RecordFieldConfig } from '@ops/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { LEAD_FORM_COPY, type LeadFormCopy } from '../../../i18n/lead-form-copy'
import { createLead } from '../../../server/crm/leads/actions'
import { ensureSource } from '../../../server/actions/settings/lists'

const fields = (copy: LeadFormCopy, sources: readonly { id: string; name: string }[]): readonly RecordFieldConfig[] => [
  { name: 'title', label: copy.title, placeholder: copy.titlePlaceholder, required: true },
  { name: 'firstName', label: copy.firstName, placeholder: copy.firstNamePlaceholder, half: true },
  { name: 'lastName', label: copy.lastName, placeholder: copy.lastNamePlaceholder, half: true },
  { name: 'companyName', label: copy.company, placeholder: copy.companyPlaceholder },
  { name: 'email', label: copy.email, type: 'email', placeholder: 'jane@acme.test', half: true },
  { name: 'phone', label: copy.phone, type: 'tel', placeholder: '+1 555 000 0000', half: true },
  {
    name: 'sourceId',
    label: copy.source,
    type: 'select',
    placeholder: copy.sourcePlaceholder,
    half: true,
    options: sources.map((source) => ({ value: source.id, label: source.name })),
  },
  { name: 'newSource', label: copy.newSource, placeholder: copy.newSourcePlaceholder, maxLength: 120, half: true },
]

type SaveFailure = Readonly<{ message: string; fields?: Readonly<Record<string, string>> }>
type SaveOutcome = Readonly<{ id: string }> | SaveFailure

/** The source to use: a typed-in one is added first; otherwise the one picked from the list, if any. */
async function sourceFor(newSource: unknown, chosen: unknown): Promise<Readonly<{ sourceId: unknown }> | SaveFailure> {
  const typed = typeof newSource === 'string' ? newSource.trim() : ''
  if (typed === '') return { sourceId: chosen }
  const added = await ensureSource({ name: typed })
  return added.ok ? { sourceId: added.data.id } : { message: added.error.message }
}

/** Creates the lead, adding a typed-in source first; says what went wrong, and on which fields, if it fails. */
async function saveLead(values: Readonly<Record<string, unknown>>): Promise<SaveOutcome> {
  const { newSource, ...lead } = values
  const source = await sourceFor(newSource, lead.sourceId)
  if ('message' in source) return source
  const result = await createLead({ ...lead, sourceId: source.sourceId, assigneeIds: [] })
  if (result.ok) return { id: (result.data as { id: string }).id }
  const { message, fields } = result.error
  return fields === undefined ? { message } : { message, fields }
}

export function LeadCreateForm({ sources }: Readonly<{ sources: readonly { id: string; name: string }[] }>) {
  const copy = catalogFor(LEAD_FORM_COPY, useLocale())
  const router = useRouter()
  const [error, setError] = useState<string | undefined>()
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>> | undefined>()
  return (
    <div className="grid gap-4">
      {error === undefined ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <RecordForm
        className="ops-detail-card rounded-lg border bg-card p-5"
        fields={fields(copy, sources)}
        serverErrors={fieldErrors}
        labels={{
          submit: copy.submit,
          saving: copy.saving,
          cancel: copy.cancel,
          required: copy.required,
          invalidEmail: copy.invalidEmail,
        }}
        onCancel={() => {
          router.push('/leads')
        }}
        onSubmit={async (values) => {
          setError(undefined)
          setFieldErrors(undefined)
          const outcome = await saveLead(values)
          if ('id' in outcome) router.push(`/leads/${outcome.id}`)
          else if (outcome.fields !== undefined) setFieldErrors(outcome.fields)
          else setError(outcome.message)
        }}
      />
    </div>
  )
}
