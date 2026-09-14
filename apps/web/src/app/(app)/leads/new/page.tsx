import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { getCrmDeps } from '../../../../server/crm/deps'
import { LeadCreateForm } from '../LeadCreateForm'

export const dynamic = 'force-dynamic'

export default async function NewLeadPage() {
  const sources = await (await getCrmDeps()).repo.listLookups('source')
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Leads', href: '/leads' }, { label: 'New lead' }]} />
      <PageContent>
        <PageHeader title="New lead" description="Capture a prospect and start working the pipeline." />
        <LeadCreateForm sources={sources} />
      </PageContent>
    </>
  )
}
