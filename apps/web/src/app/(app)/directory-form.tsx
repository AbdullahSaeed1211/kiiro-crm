'use client'

import { RecordForm, type FormValue, type RecordFieldConfig } from '@ops/ui/composites/RecordForm'
import { useRouter } from 'next/navigation'
import { saveContact, saveOrganization } from '../../server/crm/directory/actions'

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

export function DirectoryForm({
  kind,
  id,
  expectedUpdatedAt,
  initialValues,
  organizations = [],
  cancelHref,
}: DirectoryFormProps) {
  const router = useRouter()
  const organizationFields: RecordFieldConfig[] = [
    { name: 'name', label: 'Organization name', required: true, placeholder: 'e.g. Northstar Labs' },
    { name: 'website', label: 'Website', type: 'url', placeholder: 'https://…' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'hello@company.com' },
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 555 0100' },
  ]
  const contactFields: RecordFieldConfig[] = [
    { name: 'firstName', label: 'First name', required: true, placeholder: 'e.g. Ada' },
    { name: 'lastName', label: 'Last name', placeholder: 'e.g. Lovelace' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'ada@company.com' },
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+1 555 0100' },
    {
      name: 'organizationId',
      label: 'Organization',
      type: 'select',
      options: [{ value: '', label: 'No organization' }, ...organizations],
    },
  ]
  const fields = kind === 'organization' ? organizationFields : contactFields
  const submit = async (values: Record<string, FormValue>) => {
    const payload = kind === 'organization' ? organizationPayload(values) : contactPayload(values)
    const result = await saveRecord({ kind, id, expectedUpdatedAt, payload })
    if (!result.ok) throw new Error(result.error.message)
    const collection = kind === 'organization' ? 'organizations' : 'contacts'
    router.push(`/${collection}/${result.value.id}`)
    router.refresh()
  }
  return (
    <div className="max-w-2xl space-y-6">
      <RecordForm
        fields={fields}
        initialValues={initialValues}
        labels={{
          submit: id === undefined ? 'Create record' : 'Save changes',
          saving: 'Saving…',
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
