'use client'

import { RecordForm, type FormValue, type RecordFieldConfig } from '@ops/ui/composites/RecordForm'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createProject } from '../../../../server/actions/work/projects/createProject'

function optional(value: FormValue): string | null {
  const text = String(value ?? '').trim()
  return text === '' ? null : text
}

export function ProjectCreateForm({
  organizations,
  organizationId,
  cancelHref,
}: Readonly<{
  organizations: readonly { readonly value: string; readonly label: string }[]
  organizationId: string
  cancelHref: string
}>) {
  const router = useRouter()
  const [error, setError] = useState<string | undefined>()
  const fields: readonly RecordFieldConfig[] = [
    { name: 'name', label: 'Project name', required: true, maxLength: 200, placeholder: 'e.g. Website redesign' },
    {
      name: 'organizationId',
      label: 'Organization',
      type: 'select',
      placeholder: 'No organization',
      options: organizations,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      maxLength: 20000,
      placeholder: 'What is this project for?',
    },
  ]
  const submit = async (values: Record<string, FormValue>) => {
    setError(undefined)
    const result = await createProject({
      name: String(values.name ?? '').trim(),
      organizationId: optional(values.organizationId ?? null),
      description: optional(values.description ?? null),
    })
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    router.push(`/projects/${result.data.id}`)
    router.refresh()
  }
  return (
    <div className="ops-detail-card max-w-2xl rounded-lg border bg-card p-5">
      {error === undefined ? null : (
        <p
          className="mb-5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
      <RecordForm
        fields={fields}
        initialValues={{ name: '', organizationId, description: '' }}
        labels={{
          submit: 'Create project',
          saving: 'Creating…',
          cancel: 'Cancel',
          required: 'This field is required.',
        }}
        onSubmit={submit}
        onCancel={() => {
          router.push(cancelHref)
        }}
      />
    </div>
  )
}
