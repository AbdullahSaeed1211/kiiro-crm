import { notFound } from 'next/navigation'
import { BILLING_COPY } from '../../../../i18n/billing-copy'
import { catalogFor } from '../../../../i18n/locale'
import { loadClientOutstanding } from '../../../../server/billing/queries'
import { getOrganization } from '../../../../server/crm/directory/data'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { ClientBillingTab } from '../../billing/client-billing-tab'
import { OrganizationRecordView } from '../../directory-view'
import { firstParam } from '../../search-params'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'

export const dynamic = 'force-dynamic'

type Query = Record<string, string | string[] | undefined>

/**
 * What only owners and managers get on a client's page: the Billing tab, and what the client owes on the Overview. The
 * Billing list is read only while its tab is open and the amount owed only on the Overview, so other tabs pay nothing.
 */
async function billingParts(
  input: Readonly<{ context: Awaited<ReturnType<typeof getRequestContext>>; id: string; query: Query }>,
) {
  const { context, id, query } = input
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') return {}
  const tab = firstParam(query.tab)
  const locale = await loadWorkspaceLocale()
  const outstanding = tab === undefined || tab === 'overview' ? await loadClientOutstanding(context, id) : undefined
  return {
    billing: {
      label: catalogFor(BILLING_COPY, locale).clientTab,
      content: tab === 'billing' ? <ClientBillingTab organizationId={id} locale={locale} /> : null,
    },
    ...(outstanding === undefined ? {} : { outstanding }),
  }
}

/** A client's page: everything about one client behind tabs. */
export default async function OrganizationPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<Query> }>) {
  const [{ id }, query, context] = await Promise.all([params, searchParams, getRequestContext()])
  const data = await getOrganization(id)
  if (data === null) notFound()
  return (
    <OrganizationRecordView
      data={data}
      outboundEmailEnabled={await getOutboundEmailEnabled()}
      {...await billingParts({ context, id, query })}
    />
  )
}
