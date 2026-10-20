'use client'

import { RecordForm, type FormValue, type RecordFieldConfig } from '@ops/ui/composites/RecordForm'
import { useRouter } from 'next/navigation'
import { useVersionedAction } from './use-versioned-action'
import { saveContact, saveOrganization } from '../../server/crm/directory/actions'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { DIRECTORY_COPY, type DirectoryCopy } from '../../i18n/directory-copy'

type FormKind = 'organization' | 'contact'

interface DirectoryFormProps {
  readonly kind: FormKind
  readonly id?: string
  readonly expectedUpdatedAt?: number
  readonly initialValues: Record<string, FormValue>
  readonly organizations?: readonly { readonly value: string; readonly label: string }[]
  readonly cancelHref: string
}

function optional(value: FormValue): string | null {
  if (value === null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function organizationPayload(values: Record<string, FormValue>) {
  return {
    name: String(values.name ?? '').trim(),
    website: optional(values.website),
    email: optional(values.email),
    phone: optional(values.phone),
  }
}

function contactPayload(values: Record<string, FormValue>) {
  return {
    firstName: String(values.firstName ?? '').trim(),
    lastName: optional(values.lastName),
    email: optional(values.email),
    phone: optional(values.phone),
    organizationId: optional(values.organizationId),
  }
}

function fieldsFor({
  kind,
  copy,
  organizations,
}: Readonly<{
  kind: FormKind
  copy: DirectoryCopy
  organizations: NonNullable<DirectoryFormProps['organizations']>
}>): RecordFieldConfig[] {
  const email = { name: 'email', label: copy.email, type: 'email', half: true } as const
  const phone = { name: 'phone', label: copy.phone, type: 'tel', placeholder: '+1 555 0100', half: true } as const
  if (kind === 'organization')
    return [
      { name: 'name', label: copy.organizationName, required: true, placeholder: copy.organizationNamePlaceholder },
      { name: 'website', label: copy.website, type: 'url', placeholder: 'https://…' },
      { ...email, placeholder: 'hello@company.com' },
      phone,
    ]
  return [
    { name: 'firstName', label: copy.firstName, required: true, placeholder: copy.firstNamePlaceholder, half: true },
    { name: 'lastName', label: copy.lastName, placeholder: copy.lastNamePlaceholder, half: true },
    { ...email, placeholder: 'ada@company.com' },
    phone,
    {
      name: 'organizationId',
      label: copy.organization,
      type: 'select',
      options: [{ value: '', label: copy.noOrganization }, ...organizations],
    },
  ]
}

function submitLabel({ kind, saved, copy }: Readonly<{ kind: FormKind; saved: boolean; copy: DirectoryCopy }>): string {
  if (saved) return copy.saveChanges
  return kind === 'organization' ? copy.createOrganization : copy.createContact
}

export function DirectoryForm({
  kind,
  id,
  expectedUpdatedAt,
  initialValues,
  organizations = [],
  cancelHref,
}: DirectoryFormProps) {
  const router = useRouter()
  const { run, error } = useVersionedAction()
  const copy = catalogFor(DIRECTORY_COPY, useLocale())
  const fields = fieldsFor({ kind, copy, organizations })
  const submit = async (values: Record<string, FormValue>) => {
    const payload = kind === 'organization' ? organizationPayload(values) : contactPayload(values)
    const saved = await run(() => saveRecord({ kind, id, expectedUpdatedAt, payload }))
    if (saved === null) return
    const collection = kind === 'organization' ? 'organizations' : 'contacts'
    router.push(`/${collection}/${saved.value.id}`)
    router.refresh()
  }
  return (
    <div className="max-w-2xl space-y-6">
      {error === undefined ? null : (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
      <RecordForm
        className="ops-detail-card rounded-lg border bg-card p-5"
        fields={fields}
        initialValues={initialValues}
        labels={{
          submit: submitLabel({ kind, saved: id !== undefined, copy }),
          saving: copy.saving,
          cancel: copy.cancel,
          required: copy.required,
          invalidEmail: copy.invalidEmail,
        }}
        onSubmit={submit}
        onCancel={() => {
          router.push(cancelHref)
        }}
      />
    </div>
  )
}

async function saveRecord(
  options: Readonly<{
    kind: FormKind
    id: string | undefined
    expectedUpdatedAt: number | undefined
    payload: Record<string, string | null>
  }>,
) {
  const { kind, id, expectedUpdatedAt, payload } = options
  if (id === undefined) return kind === 'organization' ? saveOrganization(payload) : saveContact(payload)
  const input = { id, expectedUpdatedAt, patch: payload }
  return kind === 'organization' ? saveOrganization(input) : saveContact(input)
}
