'use client'

import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { PROJECT_PAGE_COPY } from '../../../../i18n/project-page-copy'
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
  const copy = catalogFor(PROJECT_PAGE_COPY, useLocale())
  const [error, setError] = useState<string | undefined>()
  const fields: readonly RecordFieldConfig[] = [
    {
      name: 'name',
      label: copy.projectName,
      required: true,
      maxLength: 200,
      placeholder: copy.projectNamePlaceholder,
    },
    {
      name: 'organizationId',
      label: copy.organization,
      type: 'select',
      placeholder: copy.noOrganization,
      options: organizations,
    },
    {
      name: 'description',
      label: copy.description,
      type: 'textarea',
      maxLength: 20000,
      placeholder: copy.descriptionPlaceholder,
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
          submit: copy.createProject,
          saving: copy.creating,
          cancel: copy.cancelTitle,
          required: copy.required,
        }}
        onSubmit={submit}
        onCancel={() => {
          router.push(cancelHref)
        }}
      />
    </div>
  )
}
