import { PageContent } from '@ops/ui/composites/AppShell'
import { notFound } from 'next/navigation'
import { DirectoryForm } from '../../../directory-form'
import { DirectoryFormHeader, DirectoryFormIntro } from '../../../directory-view'
import { getOrganizationRecord } from '../../../../../server/crm/directory/organization-record'

export const dynamic = 'force-dynamic'

export default async function EditOrganizationPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const record = await getOrganizationRecord((await params).id)
  if (record === undefined) notFound()
  return (
    <>
      <DirectoryFormHeader kind="organization" record={{ id: record.id, name: record.name }} />
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
