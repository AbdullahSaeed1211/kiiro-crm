import type { Metadata } from 'next'
import { BILLING_COPY } from '../../../../i18n/billing-copy'
import { catalogFor, fill } from '../../../../i18n/locale'
import { PORTAL_CLIENT_COPY } from '../../../../i18n/portal-copy'
import { loadPortalView, loadPortalWorkspace } from '../../../../server/billing/portal-page'
import { awaitsAnswer, DocumentList, InvalidLink, ProjectList, Section, type SectionContext } from './portal-sections'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Portal' }

/** A client's own page: quotes waiting for an answer, then invoices, quotes and project progress. */
export default async function PortalPage({ params }: Readonly<{ params: Promise<{ token: string }> }>) {
  const { token } = await params
  const [workspace, view] = await Promise.all([loadPortalWorkspace(), loadPortalView(token)])
  const copy = catalogFor(PORTAL_CLIENT_COPY, workspace.locale)
  if (view === undefined) return <InvalidLink copy={copy} />
  const now = Date.now()
  const context: SectionContext = {
    token,
    copy,
    billing: catalogFor(BILLING_COPY, workspace.locale),
    locale: workspace.locale === 'es' ? 'es-ES' : 'en-US',
    now,
  }
  const toAnswer = view.quotes.filter((quote) => awaitsAnswer(quote, now))
  const otherQuotes = view.quotes.filter((quote) => !awaitsAnswer(quote, now))
  return (
    <>
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {fill(copy.title, { company: view.organizationName })}
        </h1>
        <p className="text-sm text-muted-foreground">{fill(copy.intro, { agency: workspace.brand.appName })}</p>
      </header>
      {toAnswer.length === 0 ? null : (
        <Section title={copy.toAnswer}>
          <DocumentList documents={toAnswer} context={context} />
        </Section>
      )}
      <Section title={copy.invoices}>
        <DocumentList documents={view.invoices} context={context} />
      </Section>
      {otherQuotes.length === 0 ? null : (
        <Section title={copy.quotes}>
          <DocumentList documents={otherQuotes} context={context} />
        </Section>
      )}
      <Section title={copy.projects}>
        <ProjectList projects={view.projects} context={context} />
      </Section>
      <p className="text-xs text-muted-foreground">{copy.poweredBy}</p>
    </>
  )
}
