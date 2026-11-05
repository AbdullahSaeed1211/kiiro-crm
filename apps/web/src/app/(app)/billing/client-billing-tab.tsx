import Link from 'next/link'
import { BILLING_COPY } from '../../../i18n/billing-copy'
import { catalogFor, type Locale } from '../../../i18n/locale'
import { PORTAL_LINK_DAYS } from '@ops/module-billing'
import { loadBillingPage, loadCompanyName } from '../../../server/billing/queries'
import { loadClientPortal } from '../../../server/billing/portal-queries'
import { ClientPortalCard } from './client-portal-card'
import { getRequestContext } from '@/server/container'
import { BillingRows } from './billing-rows'

const link = 'inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted'

/** A client's quotes and invoices, the two ways to start a new one, and the client portal. Owners and managers only. */
export async function ClientBillingTab({
  organizationId,
  locale,
}: Readonly<{ organizationId: string; locale: Locale }>) {
  const context = await getRequestContext()
  const copy = catalogFor(BILLING_COPY, locale)
  const [page, portal, company] = await Promise.all([
    loadBillingPage(context, { kind: undefined, page: 1, organizationId }),
    loadClientPortal(context, organizationId),
    loadCompanyName(context, organizationId),
  ])
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Link className={link} href={`/billing/new?kind=quote&organizationId=${organizationId}`}>
            {copy.newQuote}
          </Link>
          <Link className={link} href={`/billing/new?kind=invoice&organizationId=${organizationId}`}>
            {copy.newInvoice}
          </Link>
        </div>
        {page.total > page.rows.length ? (
          <Link className="text-sm text-muted-foreground hover:underline" href="/billing">
            {copy.title}
          </Link>
        ) : null}
      </div>
      {page.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.nothing}</p>
      ) : (
        <BillingRows copy={copy} page={page} locale={locale === 'es' ? 'es-ES' : 'en-US'} />
      )}
      <ClientPortalCard
        client={{ organizationId, company, days: PORTAL_LINK_DAYS }}
        links={portal.links}
        recipients={portal.recipients}
      />
    </div>
  )
}
