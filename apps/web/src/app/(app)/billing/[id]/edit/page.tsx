import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { BILLING_COPY } from '../../../../../i18n/billing-copy'
import { catalogFor } from '../../../../../i18n/locale'
import { loadBillingView } from '../../../../../server/billing/queries'
import { getRequestContext } from '@/server/container'
import { loadWorkspaceLocale } from '../../../../../server/queries/work/read-models'
import { BillingForm } from '../../billing-form'
import { toDraft } from '../../line-model'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Edit quote or invoice' }

/** Edits a draft; a document that has been sent opens its page instead. */
export default async function EditBillingPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const context = await getRequestContext()
  if (context.actor.role !== 'owner' && context.actor.role !== 'manager') notFound()
  const { id } = await params
  const view = await loadBillingView(context, id)
  if (view === undefined) notFound()
  const { document } = view
  if (document.status !== 'draft') redirect(`/billing/${id}`)
  const copy = catalogFor(BILLING_COPY, await loadWorkspaceLocale())
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title, href: '/billing' }, { label: document.number }]} />
      <PageContent>
        <PageHeader title={`${copy.edit} ${document.number}`} />
        <BillingForm
          start={{
            kind: document.kind,
            currency: document.currency,
            edit: { id, expectedUpdatedAt: document.updatedAt, company: view.company },
            lines: document.lines.map((line) => toDraft(line, document.currency)),
            note: document.note ?? '',
            dueDate: document.dueAt === null ? '' : new Date(document.dueAt).toISOString().slice(0, 10),
          }}
        />
      </PageContent>
    </>
  )
}
