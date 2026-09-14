import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { notFound } from 'next/navigation'
import { DirectoryForm } from '../../../directory-form'
import { DirectoryFormIntro } from '../../../directory-view'
import { getOrganization } from '../../../../../server/crm/directory/data'

export const dynamic = 'force-dynamic'

export default async function EditOrganizationPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const data = await getOrganization((await params).id)
  if (data === null) notFound()
  const { record } = data
  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: 'Organizations', href: '/organizations' },
          { label: record.name, href: `/organizations/${record.id}` },
          { label: 'Edit' },
        ]}
      />
      <PageContent>
        <DirectoryFormIntro kind="organization" edit />
        <DirectoryForm
          kind="organization"
          id={record.id}
          expectedUpdatedAt={record.updatedAt}
          initialValues={{
            name: record.name,
            website: record.website ?? '',
            email: record.email ?? '',
            phone: record.phone ?? '',
          }}
          cancelHref={`/organizations/${record.id}`}
        />
      </PageContent>
    </>
  )
}
