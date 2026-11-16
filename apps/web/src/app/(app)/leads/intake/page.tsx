import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { catalogFor } from '../../../../i18n/locale'
import { LEAD_INTAKE_COPY } from '../../../../i18n/lead-intake-copy'
import { normalizeLocale } from '../../../../i18n/config'
import { getProductContext, getWorkspaceSettings } from '../../../../server/auth/context'
import { listActiveHostedIntakeForms } from '../../../../server/queries/crm/active-hosted-intake-forms'
import { shellLabels } from '../../../../server/shell-labels'
import { LeadIntakeClient } from '../LeadIntakeClient'

export const dynamic = 'force-dynamic'

/** Sales intake launcher with the active published forms embedded in the CRM shell. */
export default async function LeadIntakePage() {
  const [context, settings, label] = await Promise.all([getProductContext(), getWorkspaceSettings(), shellLabels()])
  const locale = normalizeLocale(settings.locale)
  const copy = catalogFor(LEAD_INTAKE_COPY, locale)
  const forms = await listActiveHostedIntakeForms(context)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: label('leads'), href: '/leads' }, { label: copy.title }]} />
      <PageContent>
        <PageHeader title={copy.title} description={copy.description} />
        <LeadIntakeClient forms={forms} locale={locale} />
      </PageContent>
    </>
  )
}
