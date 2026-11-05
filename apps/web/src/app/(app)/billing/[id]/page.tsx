import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BILLING_COPY, type BillingCopy } from '../../../../i18n/billing-copy'
import { catalogFor } from '../../../../i18n/locale'
import { loadBillingView, type BillingView } from '../../../../server/billing/queries'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { BillingActions } from '../billing-actions'
import { BillingEmail } from '../billing-email'
import { emailDraftFor } from '../billing-email-draft'
import { DocumentLines } from '../document-lines'
import { StatusChip } from '../status-chip'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Quote or invoice' }

// Prints only the document: the rest of the page, including the sidebar, is hidden on paper.
const PRINT_ONLY =
  '@media print { body * { visibility: hidden } .billing-print, .billing-print * { visibility: visible } .billing-print { position: absolute; left: 0; top: 0; width: 100% } }'

type Props = Readonly<{ copy: BillingCopy; view: BillingView; locale: string }>

function Summary({ copy, view, locale }: Props) {
  const { document } = view
  const date = (time: number) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(time)
  return (
    <header className="grid gap-1">
      <h1 className="text-2xl font-semibold">{document.number}</h1>
      <p className="text-sm">
        {view.company}
        {view.contact === '' ? '' : ' · ' + view.contact}
      </p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <StatusChip status={view.shown} label={copy.states[view.shown] ?? view.shown} />
        {document.dueAt === null ? null : (
          <span>
            {document.kind === 'quote' ? copy.dueQuote : copy.dueInvoice}: {date(document.dueAt)}
          </span>
        )}
        {view.sourceNumber === '' ? null : <span>{copy.fromQuote.replace('{number}', view.sourceNumber)}</span>}
      </p>
    </header>
  )
}

/** One quote or invoice, with the buttons that move it on and a print layout. */
export default async function BillingDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const context = await getRequestContext()
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') notFound()
  const { id } = await params
  const view = await loadBillingView(context, id)
  if (view === undefined) notFound()
  const workspace = await loadWorkspaceLocale()
  const copy = catalogFor(BILLING_COPY, workspace)
  const locale = workspace === 'es' ? 'es-ES' : 'en-US'
  const { document } = view
  const draft = emailDraftFor({ document, copy, locale })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title, href: '/billing' }, { label: document.number }]} />
      <PageContent>
        <style>{PRINT_ONLY}</style>
        <Link href="/billing" className="text-sm underline print:hidden">
          {copy.back}
        </Link>
        <BillingActions target={{ id, kind: document.kind, status: document.status, updatedAt: document.updatedAt }} />
        <BillingEmail
          target={{
            id,
            organizationId: document.organizationId,
            status: document.status,
            updatedAt: document.updatedAt,
            defaultTo: view.contactEmail,
            draft,
          }}
        />
        <article className="billing-print grid max-w-3xl gap-4 rounded-lg border bg-card p-4">
          <Summary copy={copy} view={view} locale={locale} />
          <DocumentLines copy={copy} document={view.document} locale={locale} />
          {document.note === null ? null : <p className="text-sm">{document.note}</p>}
        </article>
      </PageContent>
    </>
  )
}
