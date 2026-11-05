import { notFound } from 'next/navigation'
import { BILLING_COPY } from '../../../../i18n/billing-copy'
import { catalogFor } from '../../../../i18n/locale'
import { loadClientOutstanding } from '../../../../server/billing/queries'
import { getOrganization } from '../../../../server/crm/directory/data'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { ClientBillingTab } from '../../billing/client-billing-tab'
import { OrganizationRecordView } from '../../directory-view'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'

export const dynamic = 'force-dynamic'

/**
 * What only owners and managers get on a client's page: the Billing tab, and what the client owes on the Overview. The
 * tabs switch in the browser without asking the server again, so the Billing list has to be part of the page.
 */
async function billingParts(input: Readonly<{ context: Awaited<ReturnType<typeof getRequestContext>>; id: string }>) {
  const { context, id } = input
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') return {}
  const locale = await loadWorkspaceLocale()
  return {
    billing: {
      label: catalogFor(BILLING_COPY, locale).clientTab,
      content: <ClientBillingTab organizationId={id} locale={locale} />,
    },
    outstanding: await loadClientOutstanding(context, id),
  }
}

/** A client's page: everything about one client behind tabs. */
export default async function OrganizationPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const [{ id }, context] = await Promise.all([params, getRequestContext()])
  const data = await getOrganization(id)
  if (data === null) notFound()
  return (
    <OrganizationRecordView
      data={data}
      outboundEmailEnabled={await getOutboundEmailEnabled()}
      {...await billingParts({ context, id })}
    />
  )
}
