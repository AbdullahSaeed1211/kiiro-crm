import { PageContent } from '@ops/ui/composites/AppShell'
import { DirectoryForm } from '../../directory-form'
import { DirectoryFormHeader, DirectoryFormIntro } from '../../directory-view'

export default function NewOrganizationPage() {
  return (
    <>
      <DirectoryFormHeader kind="organization" />
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
