import { formFieldsSchema } from '@ops/module-intake'
import { notFound } from 'next/navigation'
import { payloadData, payloadForAuth } from '../../../../server/auth/api'
import { HostedForm } from './hosted-form'

export const dynamic = 'force-dynamic'

/** The public page of an intake form that has questions; forms without questions stay API-only. */
export default async function HostedFormPage({ params }: Readonly<{ params: Promise<{ key: string }> }>) {
  const { key } = await params
  const payload = await payloadForAuth()
  const found = await payloadData(payload).find({
    collection: 'intakeForms',
    where: { and: [{ key: { equals: key } }, { active: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const form = found.docs.at(0)
  const fields = formFieldsSchema.safeParse(form?.formFields ?? [])
  if (form === undefined || !fields.success || fields.data.length === 0) notFound()
  const name = typeof form.name === 'string' ? form.name : key
  const success = typeof form.successMessage === 'string' ? form.successMessage : 'Thanks. We will be in touch.'
  return <HostedForm formKey={key} title={name} fields={fields.data} successMessage={success} />
}
