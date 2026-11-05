import { AppHeader } from '@ops/ui/composites/AppHeader'
import { shellLabels } from '../../../../server/shell-labels'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { crmDeps } from '@/server/container'
import { LeadCreateForm } from '../LeadCreateForm'

export const dynamic = 'force-dynamic'

export default async function NewLeadPage() {
  const label = await shellLabels()
  const sources = await (await crmDeps()).repo.listLookups('source')
  return (
    <>
      <AppHeader breadcrumbs={[{ label: label('leads'), href: '/leads' }, { label: label('newLead') }]} />
      <PageContent>
        <PageHeader title="New lead" description="Capture a prospect and start working the pipeline." />
        <LeadCreateForm sources={sources} />
      </PageContent>
    </>
  )
}
