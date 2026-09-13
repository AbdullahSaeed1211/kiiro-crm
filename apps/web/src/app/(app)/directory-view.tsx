import { Button } from '@ops/ui/components/ui/button'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { ReactNode } from 'react'
import { DirectoryFilters } from './directory-filters'

export { ContactsTable, OrganizationsTable } from './directory-list-view'
export { ContactRecordView, OrganizationRecordView } from './directory-record-view'

export function DirectoryListHeader({
  kind,
  total,
  query,
  children,
}: Readonly<{ kind: 'organizations' | 'contacts'; total: number; query: string; children: ReactNode }>) {
  const isOrganizations = kind === 'organizations'
  const title = isOrganizations ? 'Organizations' : 'Contacts'
  const description = isOrganizations
    ? 'Companies, clients, and partners in your workspace.'
    : 'People connected to the organizations your team works with.'
  const action = isOrganizations ? 'New organization' : 'New contact'
  return (
    <>
      <AppHeader breadcrumbs={[{ label: title }]} />
      <PageContent>
        <PageHeader
          title={title}
          count={total}
          description={description}
          actions={<Button render={<a href={`/${kind}/new`}>{action}</a>}>{action}</Button>}
        />
        <DirectoryFilters query={query} />
        {children}
      </PageContent>
    </>
  )
}

export function DirectoryFormIntro({ kind, edit }: Readonly<{ kind: 'organization' | 'contact'; edit?: boolean }>) {
  const organization = kind === 'organization'
  const label = organization ? 'Organization' : 'Contact'
  return (
    <div className="mb-6 max-w-2xl">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span className="size-2 rounded-full bg-primary" />
        {label}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {edit ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {organization
          ? 'Keep company details and relationships easy for the whole team to trust.'
          : 'Add a person and connect them to the organization they represent.'}
      </p>
    </div>
  )
}
