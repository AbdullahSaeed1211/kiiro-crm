import { formFieldsSchema } from '@ops/module-intake'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { notFound } from 'next/navigation'
import { payloadData, payloadForAuth } from '../../../../server/auth/api'
import { HostedForm } from './hosted-form'

export const dynamic = 'force-dynamic'

/** The active form with this key, when it has questions to show; forms without questions stay API-only. */
async function loadHostedForm(key: string) {
  const found = await payloadData(await payloadForAuth()).find({
    collection: 'intakeForms',
    where: { and: [{ key: { equals: key } }, { active: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const form = found.docs.at(0)
  const fields = formFieldsSchema.safeParse(form?.formFields ?? [])
  if (form === undefined || !fields.success || fields.data.length === 0) return undefined
  return {
    fields: fields.data,
    title: typeof form.name === 'string' ? form.name : key,
    success: typeof form.successMessage === 'string' ? form.successMessage : 'Thanks. We will be in touch.',
  }
}

/** The tenant's Turnstile site key. Production verifies a token on every submission, so it cannot go without one. */
async function turnstileSiteKey(): Promise<string | undefined> {
  const { env } = await getCloudflareContext({ async: true })
  const siteKey = env.TURNSTILE_SITE_KEY.trim()
  return siteKey === '' && process.env.NODE_ENV === 'production' ? undefined : siteKey
}

/** The public page of an intake form that has questions. */
export default async function HostedFormPage({ params }: Readonly<{ params: Promise<{ key: string }> }>) {
  const { key } = await params
  const [form, siteKey] = await Promise.all([loadHostedForm(key), turnstileSiteKey()])
  if (form === undefined || siteKey === undefined) notFound()
  return (
    <HostedForm formKey={key} title={form.title} fields={form.fields} successMessage={form.success} siteKey={siteKey} />
  )
}
