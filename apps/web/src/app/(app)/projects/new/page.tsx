import { AppHeader } from '@ops/ui/composites/AppHeader'
import { shellLabels } from '../../../../server/shell-labels'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { organizationChoice } from '../../../../server/crm/directory/data'
import { ProjectCreateForm } from './ProjectCreateForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'New project' }

export default async function NewProjectPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ organizationId?: string | string[] }> }>) {
  const label = await shellLabels()
  const { organizations, organizationId } = await organizationChoice(searchParams)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: label('projects'), href: '/projects' }]} />
      <PageContent>
        <PageHeader title="New project" description="Create a project and connect it to a client organization." />
        <ProjectCreateForm
          organizations={organizations}
          organizationId={organizationId}
          cancelHref={organizationId === '' ? '/projects' : `/organizations/${organizationId}?tab=overview`}
        />
      </PageContent>
    </>
  )
}
