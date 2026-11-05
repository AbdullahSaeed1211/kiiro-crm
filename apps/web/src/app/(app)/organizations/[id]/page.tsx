import { notFound } from 'next/navigation'
import { BILLING_COPY } from '../../../../i18n/billing-copy'
import { catalogFor } from '../../../../i18n/locale'
import { firstParam } from '../../search-params'
import { loadClientOutstanding } from '../../../../server/billing/queries'
import { getOrganization, type OrganizationTab } from '../../../../server/crm/directory/data'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { ClientBillingTab } from '../../billing/client-billing-tab'
import { OrganizationRecordView } from '../../directory-view'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'

export const dynamic = 'force-dynamic'

const TABS: readonly OrganizationTab[] = ['overview', 'notes', 'activity', 'tasks', 'billing', 'files', 'email']

/** The open tab from the address; anything unknown opens the Overview. */
function tabOf(value: string | undefined): OrganizationTab {
  return TABS.find((tab) => tab === value) ?? 'overview'
}

/**
 * What only owners and managers get on a client's page: the Billing tab, and what the client owes on the Overview.
 * Their data is read only for the tab that shows it.
 */
async function billingParts(
  input: Readonly<{ context: Awaited<ReturnType<typeof getRequestContext>>; id: string; tab: OrganizationTab }>,
) {
  const { context, id, tab } = input
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') return {}
  const locale = await loadWorkspaceLocale()
  return {
    billing: {
      label: catalogFor(BILLING_COPY, locale).clientTab,
      content: tab === 'billing' ? <ClientBillingTab organizationId={id} locale={locale} /> : null,
    },
    ...(tab === 'overview' ? { outstanding: await loadClientOutstanding(context, id) } : {}),
  }
}

/** A client's page: everything about one client behind tabs; the server builds only the open tab. */
export default async function OrganizationPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const [{ id }, query, context] = await Promise.all([params, searchParams, getRequestContext()])
  const tab = tabOf(firstParam(query.tab))
  const data = await getOrganization(id, tab)
  if (data === null) notFound()
  return (
    <OrganizationRecordView
      data={data}
      tab={tab}
      outboundEmailEnabled={await getOutboundEmailEnabled()}
      {...await billingParts({ context, id, tab })}
    />
  )
}
