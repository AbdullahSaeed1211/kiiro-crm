import type { BillingDocument } from '@ops/module-billing'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BILLING_COPY, type BillingCopy } from '../../../../../i18n/billing-copy'
import { catalogFor, fill } from '../../../../../i18n/locale'
import { PORTAL_CLIENT_COPY, type PortalClientCopy } from '../../../../../i18n/portal-copy'
import { loadPortalView, loadPortalWorkspace } from '../../../../../server/billing/portal-page'
import { DocumentLines } from '../../../../(app)/billing/document-lines'
import { StatusChip } from '../../../../(app)/billing/status-chip'
import { awaitsAnswer, dueLabel, InvalidLink, shownState } from '../portal-sections'
import { PrintButton, QuoteAnswer } from './quote-answer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Document' }

interface Shown {
  readonly document: BillingDocument
  readonly company: string
  readonly agency: string
  readonly billing: BillingCopy
  readonly copy: PortalClientCopy
  readonly locale: string
  readonly now: number
  readonly token: string
}

function DocumentCard({ shown }: Readonly<{ shown: Shown }>) {
  const { document, billing, locale } = shown
  const state = shownState(document, shown.now)
  return (
    <article className="grid gap-5 rounded-xl border bg-background p-5 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{document.number}</h1>
          <p className="text-sm text-muted-foreground">
            {shown.agency} · {shown.company}
          </p>
        </div>
        <div className="grid justify-items-end gap-1 text-sm">
          <StatusChip status={state} label={billing.states[state] ?? state} />
          <span className="text-muted-foreground">{dueLabel(document, shown)}</span>
        </div>
      </header>
      <DocumentLines copy={billing} document={document} locale={locale} />
      {document.note === null ? null : <p className="whitespace-pre-line text-sm">{document.note}</p>}
    </article>
  )
}

/** The payment link the agency pasted, while the invoice is unpaid. */
function payLink(document: BillingDocument): string | null {
  return document.kind === 'invoice' && document.status === 'sent' ? document.paymentLink : null
}

function DocumentActions({ shown }: Readonly<{ shown: Shown }>) {
  const { document, copy } = shown
  const pay = payLink(document)
  const answered = document.kind === 'quote' && document.decidedAt !== null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {awaitsAnswer(document, shown.now) ? <QuoteAnswer token={shown.token} quoteId={document.id} /> : null}
      {answered ? (
        <p className="text-sm text-muted-foreground" role="status">
          {fill(copy.answered, { agency: shown.agency })}
        </p>
      ) : null}
      {pay === null ? null : (
        <a
          href={pay}
          rel="noopener noreferrer"
          target="_blank"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 print:hidden"
        >
          {copy.pay}
        </a>
      )}
      <PrintButton label={copy.print} />
    </div>
  )
}

/** One quote or invoice as the client sees it, with Accept and Decline while a quote is open. */
export default async function PortalDocumentPage({
  params,
}: Readonly<{ params: Promise<{ token: string; documentId: string }> }>) {
  const { token, documentId } = await params
  const [workspace, view] = await Promise.all([loadPortalWorkspace(), loadPortalView(token)])
  const copy = catalogFor(PORTAL_CLIENT_COPY, workspace.locale)
  const document = [...(view?.quotes ?? []), ...(view?.invoices ?? [])].find((entry) => entry.id === documentId)
  if (view === undefined || document === undefined) return <InvalidLink copy={copy} />
  const shown: Shown = {
    document,
    company: view.organizationName,
    agency: workspace.brand.appName,
    billing: catalogFor(BILLING_COPY, workspace.locale),
    copy,
    locale: workspace.locale === 'es' ? 'es-ES' : 'en-US',
    now: Date.now(),
    token,
  }
  return (
    <>
      <Link href={`/portal/${token}`} className="w-fit text-sm text-muted-foreground hover:underline print:hidden">
        ← {copy.back}
      </Link>
      <DocumentCard shown={shown} />
      <DocumentActions shown={shown} />
    </>
  )
}
