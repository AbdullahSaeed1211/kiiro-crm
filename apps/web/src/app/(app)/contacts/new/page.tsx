import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { DirectoryForm } from '../../directory-form'
import { DirectoryFormIntro } from '../../directory-view'
import { organizationChoice } from '../../../../server/crm/directory/data'

export default async function NewContactPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ organizationId?: string | string[] }> }>) {
  const { organizations, organizationId } = await organizationChoice(searchParams)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Contacts', href: '/contacts' }, { label: 'New contact' }]} />
      <PageContent>
        <DirectoryFormIntro kind="contact" />
        <DirectoryForm
          kind="contact"
          organizations={organizations}
          initialValues={{ firstName: '', lastName: '', email: '', phone: '', organizationId }}
          cancelHref={organizationId === '' ? '/contacts' : `/organizations/${organizationId}?tab=overview`}
        />
      </PageContent>
    </>
  )
}
