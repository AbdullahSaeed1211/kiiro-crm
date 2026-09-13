import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { DirectoryForm } from '../../directory-form'
import { DirectoryFormIntro } from '../../directory-view'

export default function NewOrganizationPage() {
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Organizations', href: '/organizations' }, { label: 'New organization' }]} />
      <PageContent>
        <DirectoryFormIntro kind="organization" />
        <DirectoryForm
          kind="organization"
          initialValues={{ name: '', website: '', email: '', phone: '' }}
          cancelHref="/organizations"
        />
      </PageContent>
    </>
  )
}
