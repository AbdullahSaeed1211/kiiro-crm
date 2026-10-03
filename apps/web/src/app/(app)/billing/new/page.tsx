import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BILLING_COPY } from '../../../../i18n/billing-copy'
import { catalogFor } from '../../../../i18n/locale'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { firstParam } from '../../search-params'
import { BillingForm } from '../billing-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'New quote or invoice' }

/** A blank quote or invoice. The workspace currency is the starting currency. */
export default async function NewBillingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const context = await getRequestContext()
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') notFound()
  const kind = firstParam((await searchParams).kind) === 'invoice' ? 'invoice' : 'quote'
  const [settings, locale] = await Promise.all([getWorkspaceSettings(), loadWorkspaceLocale()])
  const copy = catalogFor(BILLING_COPY, locale)
  const currency = typeof settings.currency === 'string' ? settings.currency : 'USD'
  const title = kind === 'quote' ? copy.newQuote : copy.newInvoice
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title, href: '/billing' }, { label: title }]} />
      <PageContent>
        <PageHeader title={title} />
        <BillingForm start={{ kind, currency }} />
      </PageContent>
    </>
  )
}
