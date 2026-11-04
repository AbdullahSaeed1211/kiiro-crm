import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { ViewSwitcher } from '@ops/ui/composites/ViewSwitcher'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BILLING_COPY, type BillingCopy } from '../../../i18n/billing-copy'
import { catalogFor } from '../../../i18n/locale'
import { BILLING_PAGE_SIZE, loadBillingPage } from '../../../server/billing/queries'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
import { firstParam } from '../search-params'
import { BillingRows } from './billing-rows'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quotes and invoices' }

type Kind = 'quote' | 'invoice' | undefined

function Pager({ copy, page, total, kind }: Readonly<{ copy: BillingCopy; page: number; total: number; kind: Kind }>) {
  const last = Math.max(1, Math.ceil(total / BILLING_PAGE_SIZE))
  const prefix = kind === undefined ? '' : 'kind=' + kind + '&'
  const href = (target: number) => '/billing?' + prefix + 'page=' + String(target)
  if (last === 1) return null
  return (
    <nav className="flex items-center justify-between text-xs text-muted-foreground" aria-label="Pages">
      {page > 1 ? <Link href={href(page - 1)}>{copy.previous}</Link> : <span />}
      <span className="tabular-nums">
        {page} / {last}
      </span>
      {page < last ? <Link href={href(page + 1)}>{copy.next}</Link> : <span />}
    </nav>
  )
}

const kindOf = (value: string | undefined): Kind => (value === 'quote' || value === 'invoice' ? value : undefined)

const buttonClass =
  'inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted'

/** Quotes and invoices, newest first, for owners and managers. */
export default async function BillingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const context = await getRequestContext()
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') notFound()
  const params = await searchParams
  const kind = kindOf(firstParam(params.kind))
  const page = Math.max(1, Number(firstParam(params.page) ?? 1) || 1)
  const workspace = await loadWorkspaceLocale()
  const copy = catalogFor(BILLING_COPY, workspace)
  const locale = workspace === 'es' ? 'es-ES' : 'en-US'
  const found = await loadBillingPage(context, { kind, page })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title }]} />
      <PageContent>
        <PageHeader
          title={copy.title}
          description={copy.description}
          tabs={
            <ViewSwitcher
              label={copy.title}
              active={kind ?? 'all'}
              views={[
                { id: 'all', label: copy.all, href: '/billing' },
                { id: 'quote', label: copy.quotes, href: '/billing?kind=quote' },
                { id: 'invoice', label: copy.invoices, href: '/billing?kind=invoice' },
              ]}
            />
          }
          actions={
            <>
              <Link className={buttonClass} href="/billing/new?kind=quote">
                {copy.newQuote}
              </Link>
              <Link className={buttonClass} href="/billing/new?kind=invoice">
                {copy.newInvoice}
              </Link>
            </>
          }
        />
        {found.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.nothing}</p>
        ) : (
          <>
            <BillingRows copy={copy} page={found} locale={locale} />
            <Pager copy={copy} page={found.page} total={found.total} kind={kind} />
          </>
        )}
      </PageContent>
    </>
  )
}
