import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { ReactNode } from 'react'

export { ContactsTable, OrganizationsTable } from './directory-list-view'
export { ContactRecordView, OrganizationRecordView } from './directory-record-view'

export function DirectoryListHeader({
  kind,
  total,
  children,
  actions,
}: Readonly<{ kind: 'organizations' | 'contacts'; total: number; children: ReactNode; actions: ReactNode }>) {
  const isOrganizations = kind === 'organizations'
  const title = isOrganizations ? 'Organizations' : 'Contacts'
  return (
    <>
      <AppHeader breadcrumbs={[{ label: title }]} />
      <PageContent>
        <PageHeader title={title} count={total} actions={actions} />
        {children}
      </PageContent>
    </>
  )
}

export function DirectoryFormIntro({ kind, edit }: Readonly<{ kind: 'organization' | 'contact'; edit?: boolean }>) {
  const organization = kind === 'organization'
  const noun = organization ? 'organization' : 'contact'
  return (
    <PageHeader
      title={edit ? `Edit ${noun}` : `New ${noun}`}
      description={
        organization
          ? 'Keep company details and relationships easy for the whole team to trust.'
          : 'Add a person and connect them to the organization they represent.'
      }
    />
  )
}
