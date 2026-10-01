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
  { name: 'firstName', label: copy.firstName, placeholder: copy.firstNamePlaceholder },
  { name: 'lastName', label: copy.lastName, placeholder: copy.lastNamePlaceholder },
  { name: 'companyName', label: copy.company, placeholder: copy.companyPlaceholder },
  { name: 'email', label: copy.email, type: 'email', placeholder: 'jane@acme.test' },
  { name: 'phone', label: copy.phone, type: 'tel', placeholder: '+1 555 000 0000' },
  {
    name: 'sourceId',
    label: copy.source,
    type: 'select',
    placeholder: copy.sourcePlaceholder,
    options: sources.map((source) => ({ value: source.id, label: source.name })),
  },
  { name: 'newSource', label: copy.newSource, placeholder: copy.newSourcePlaceholder, maxLength: 120 },
]

export function LeadCreateForm({ sources }: Readonly<{ sources: readonly { id: string; name: string }[] }>) {
  const copy = catalogFor(LEAD_FORM_COPY, useLocale())
  const router = useRouter()
  const [error, setError] = useState<string | undefined>()
  return (
    <div className="grid gap-4">
      {error === undefined ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <RecordForm
        fields={fields(copy, sources)}
        labels={{ submit: copy.submit, saving: copy.saving, cancel: copy.cancel, required: copy.required }}
        onCancel={() => {
          router.push('/leads')
        }}
        onSubmit={async (values) => {
          setError(undefined)
          const { newSource, ...lead } = values
          const typed = typeof newSource === 'string' ? newSource.trim() : ''
          const source = typed === '' ? undefined : await ensureSource({ name: typed })
          if (source !== undefined && !source.ok) {
            setError(source.error.message)
            return
          }
          const sourceId = source?.ok === true ? source.data.id : lead.sourceId
          const result = await createLead({ ...lead, sourceId, assigneeIds: [] })
          if (result.ok) router.push(`/leads/${(result.data as { id: string }).id}`)
          else setError(result.error.message)
        }}
      />
    </div>
  )
}
