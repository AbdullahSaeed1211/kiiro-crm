import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BILLING_COPY } from '../../../../i18n/billing-copy'
import { catalogFor } from '../../../../i18n/locale'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { getRequestContext } from '@/server/container'
import { loadClientCurrency, loadCompanyName } from '../../../../server/billing/queries'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { firstParam } from '../../search-params'
import { BillingForm } from '../billing-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'New quote or invoice' }

/** The form's starting point: the kind, the client's usual currency (else the workspace's), and the client when the page was opened from one. */
async function startOf(
  context: Awaited<ReturnType<typeof getRequestContext>>,
  params: Record<string, string | string[] | undefined>,
) {
  const clientId = firstParam(params.organizationId) ?? ''
  const [settings, clientName, clientCurrency] = await Promise.all([
    getWorkspaceSettings(),
    clientId === '' ? '' : loadCompanyName(context, clientId),
    clientId === '' ? undefined : loadClientCurrency(context, clientId),
  ])
  return {
    kind: firstParam(params.kind) === 'invoice' ? ('invoice' as const) : ('quote' as const),
    currency: clientCurrency ?? (typeof settings.currency === 'string' ? settings.currency : 'USD'),
    ...(clientName === '' ? {} : { client: { id: clientId, name: clientName } }),
  }
}

/** A blank quote or invoice. The workspace currency is the starting currency. */
export default async function NewBillingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const context = await getRequestContext()
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') notFound()
  const [start, locale] = await Promise.all([startOf(context, await searchParams), loadWorkspaceLocale()])
  const copy = catalogFor(BILLING_COPY, locale)
  const title = start.kind === 'quote' ? copy.newQuote : copy.newInvoice
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title, href: '/billing' }, { label: title }]} />
      <PageContent>
        <PageHeader title={title} description={start.kind === 'quote' ? copy.newQuoteHint : copy.newInvoiceHint} />
        <BillingForm start={start} />
      </PageContent>
    </>
  )
}
