import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { notFound } from 'next/navigation'
import { DirectoryForm } from '../../../directory-form'
import { DirectoryFormIntro } from '../../../directory-view'
import { getContact, listOrganizationOptions } from '../../../../../server/crm/directory/data'

export const dynamic = 'force-dynamic'

export default async function EditContactPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const id = (await params).id
  const [data, organizations] = await Promise.all([getContact(id), listOrganizationOptions()])
  if (data === null) notFound()
  const { record } = data
  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: 'Contacts', href: '/contacts' },
          { label: displayName(record), href: `/contacts/${record.id}` },
          { label: 'Edit' },
        ]}
      />
      <PageContent>
        <DirectoryFormIntro kind="contact" edit />
        <DirectoryForm
          kind="contact"
          id={record.id}
          expectedUpdatedAt={record.updatedAt}
          organizations={organizations}
          initialValues={{
            firstName: record.firstName,
            lastName: record.lastName ?? '',
            email: record.email ?? '',
            phone: record.phone ?? '',
            organizationId: record.organizationId ?? '',
          }}
          cancelHref={`/contacts/${record.id}`}
        />
      </PageContent>
    </>
  )
}

function displayName(record: { firstName: string; lastName: string | null }): string {
  return [record.firstName, record.lastName].filter(Boolean).join(' ')
}
