import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { DirectoryForm } from '../../directory-form'
import { DirectoryFormIntro } from '../../directory-view'
import { listOrganizationOptions } from '../../../../server/crm/directory/data'

export default async function NewContactPage() {
  const organizations = await listOrganizationOptions()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Contacts', href: '/contacts' }, { label: 'New contact' }]} />
      <PageContent>
        <DirectoryFormIntro kind="contact" />
        <DirectoryForm
          kind="contact"
          organizations={organizations}
          initialValues={{ firstName: '', lastName: '', email: '', phone: '', organizationId: '' }}
          cancelHref="/contacts"
        />
      </PageContent>
    </>
  )
}
