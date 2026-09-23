import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { listOrganizationOptions } from '../../../../server/crm/directory/data'
import { ProjectCreateForm } from './ProjectCreateForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'New project' }

export default async function NewProjectPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ organizationId?: string | string[] }> }>) {
  const organizations = await listOrganizationOptions()
  const requestedOrganizationId = (await searchParams).organizationId
  const organizationId =
    typeof requestedOrganizationId === 'string' &&
    organizations.some((organization) => organization.value === requestedOrganizationId)
      ? requestedOrganizationId
      : ''
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Projects', href: '/projects' }]} />
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
