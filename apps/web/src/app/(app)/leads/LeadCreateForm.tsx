'use client'

import { RecordForm, type RecordFieldConfig } from '@ops/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createLead } from '../../../server/crm/leads/actions'

const fields = (sources: readonly { id: string; name: string }[]): readonly RecordFieldConfig[] => [
  { name: 'title', label: 'Title', placeholder: 'e.g. Website redesign inquiry', required: true },
  { name: 'firstName', label: 'First name', placeholder: 'Jane' },
  { name: 'lastName', label: 'Last name', placeholder: 'Doe' },
  { name: 'companyName', label: 'Company', placeholder: 'Acme Inc.' },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'jane@acme.test' },
  { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 555 000 0000' },
  {
    name: 'sourceId',
    label: 'Source',
    type: 'select',
    placeholder: 'Select a source',
    options: sources.map((source) => ({ value: source.id, label: source.name })),
  },
]

export function LeadCreateForm({ sources }: Readonly<{ sources: readonly { id: string; name: string }[] }>) {
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
        fields={fields(sources)}
        labels={{ submit: 'Create lead', saving: 'Creating…', cancel: 'Cancel', required: 'This field is required' }}
        onCancel={() => {
          router.push('/leads')
        }}
        onSubmit={async (values) => {
          setError(undefined)
          const result = await createLead({ ...values, assigneeIds: [] })
          if (result.ok) router.push(`/leads/${(result.data as { id: string }).id}`)
          else setError(result.error.message)
        }}
      />
    </div>
  )
}
