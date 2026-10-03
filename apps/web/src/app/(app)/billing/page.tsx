import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BILLING_COPY, type BillingCopy } from '../../../i18n/billing-copy'
import { catalogFor } from '../../../i18n/locale'
import { BILLING_PAGE_SIZE, loadBillingPage, type BillingPage } from '../../../server/billing/queries'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
import { firstParam } from '../search-params'
import { StatusChip } from './status-chip'
import { formatMoney } from './money'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quotes and invoices' }

type Kind = 'quote' | 'invoice' | undefined

const dateOf = (time: number | null, locale: string): string =>
  time === null ? '' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

function Tabs({ copy, kind }: Readonly<{ copy: BillingCopy; kind: Kind }>) {
  const tab = ({ value, label, href }: Readonly<{ value: Kind; label: string; href: string }>) => (
    <Link
      key={label}
      href={href}
      aria-current={kind === value ? 'page' : undefined}
      className={kind === value ? 'border-b-2 border-primary pb-1 font-medium' : 'pb-1 text-muted-foreground'}
    >
      {label}
    </Link>
  )
  return (
    <nav className="flex gap-4 border-b text-sm" aria-label={copy.title}>
      {tab({ value: undefined, label: copy.all, href: '/billing' })}
      {tab({ value: 'quote', label: copy.quotes, href: '/billing?kind=quote' })}
      {tab({ value: 'invoice', label: copy.invoices, href: '/billing?kind=invoice' })}
    </nav>
  )
}

function Rows({ copy, page, locale }: Readonly<{ copy: BillingCopy; page: BillingPage; locale: string }>) {
  return (
    <ul className="divide-y text-sm">
      {page.rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href={`/billing/${row.id}`} className="min-w-0 font-medium hover:underline">
            {row.number}
            <span className="block text-xs font-normal text-muted-foreground">{row.company}</span>
          </Link>
          <span className="flex items-center gap-3">
            {row.dueAt === null ? null : (
              <span className="text-xs text-muted-foreground">
                {row.kind === 'quote' ? copy.dueQuote : copy.dueInvoice}: {dateOf(row.dueAt, locale)}
              </span>
            )}
            <StatusChip status={row.shown} label={copy.states[row.shown] ?? row.shown} />
            <span className="tabular-nums">
              {formatMoney({ minor: row.totalMinor, currency: row.currency, locale })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

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
        <Tabs copy={copy} kind={kind} />
        {found.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.nothing}</p>
        ) : (
          <>
            <Rows copy={copy} page={found} locale={locale} />
            <Pager copy={copy} page={found.page} total={found.total} kind={kind} />
          </>
        )}
      </PageContent>
    </>
  )
}
