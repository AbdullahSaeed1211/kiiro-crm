import { notFound } from 'next/navigation'
import { BILLING_COPY } from '../../../../i18n/billing-copy'
import { catalogFor } from '../../../../i18n/locale'
import { getOrganization } from '../../../../server/crm/directory/data'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { ClientBillingTab } from '../../billing/client-billing-tab'
import { OrganizationRecordView } from '../../directory-view'
import { firstParam } from '../../search-params'
import { getOutboundEmailEnabled } from '../../../../server/capabilities'

export const dynamic = 'force-dynamic'

/**
 * A client's page. Billing is part of it for owners and managers, and its list is read only while that tab is open
 * (`?tab=billing`), so the other tabs cost nothing for it.
 */
export default async function OrganizationPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>) {
  const [{ id }, query, context] = await Promise.all([params, searchParams, getRequestContext()])
  const data = await getOrganization(id)
  if (data === null) notFound()
  const seesBilling = context.actor.role === 'owner' || context.actor.role === 'manager'
  const locale = seesBilling ? await loadWorkspaceLocale() : 'en'
  const billing = seesBilling
    ? {
        label: catalogFor(BILLING_COPY, locale).clientTab,
        content: firstParam(query.tab) === 'billing' ? <ClientBillingTab organizationId={id} locale={locale} /> : null,
      }
    : undefined
  return (
    <OrganizationRecordView
      data={data}
      outboundEmailEnabled={await getOutboundEmailEnabled()}
      {...(billing === undefined ? {} : { billing })}
    />
  )
}
