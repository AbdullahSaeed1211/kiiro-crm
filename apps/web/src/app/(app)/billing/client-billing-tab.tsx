import Link from 'next/link'
import { BILLING_COPY } from '../../../i18n/billing-copy'
import { catalogFor, type Locale } from '../../../i18n/locale'
import { loadBillingPage } from '../../../server/billing/queries'
import { getRequestContext } from '@/server/container'
import { BillingRows } from './billing-rows'

const link = 'inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted'

/** A client's quotes and invoices with the two ways to start a new one for that client. Owners and managers only. */
export async function ClientBillingTab({
  organizationId,
  locale,
}: Readonly<{ organizationId: string; locale: Locale }>) {
  const context = await getRequestContext()
  const copy = catalogFor(BILLING_COPY, locale)
  const page = await loadBillingPage(context, { kind: undefined, page: 1, organizationId })
  return (
    <div className="grid gap-4">
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
    </div>
  )
}
