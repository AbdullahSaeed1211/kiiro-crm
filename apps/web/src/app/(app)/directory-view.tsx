import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { ReactNode } from 'react'
import { catalogFor } from '../../i18n/locale'
import { DIRECTORY_COPY } from '../../i18n/directory-copy'
import { SECTION_HELP_COPY } from '../../i18n/section-help-copy'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'

export { ContactsTable, OrganizationsTable } from './directory-list-view'
export { ContactRecordView, OrganizationRecordView } from './directory-record-view'

export async function DirectoryListHeader({
  kind,
  total,
  children,
  actions,
}: Readonly<{ kind: 'organizations' | 'contacts'; total: number; children: ReactNode; actions: ReactNode }>) {
  const isOrganizations = kind === 'organizations'
  const locale = await loadWorkspaceLocale()
  const help = catalogFor(SECTION_HELP_COPY, locale)
  const copy = catalogFor(DIRECTORY_COPY, locale)
  const title = isOrganizations ? copy.organizationsTitle : copy.contactsTitle
  return (
    <>
      <AppHeader breadcrumbs={[{ label: title }]} />
      <PageContent>
        <PageHeader title={title} count={total} description={help[kind]} actions={actions} />
        {children}
      </PageContent>
    </>
  )
}

/** Breadcrumbs for the create and edit pages: the list, then the record being edited or the new-record page. */
export async function DirectoryFormHeader({
  kind,
  record,
}: Readonly<{ kind: 'organization' | 'contact'; record?: Readonly<{ id: string; name: string }> }>) {
  const copy = catalogFor(DIRECTORY_COPY, await loadWorkspaceLocale())
  const organization = kind === 'organization'
  const base = organization ? '/organizations' : '/contacts'
  const list = { label: organization ? copy.organizationsTitle : copy.contactsTitle, href: base }
  if (record === undefined)
    return <AppHeader breadcrumbs={[list, { label: organization ? copy.newOrganization : copy.newContact }]} />
  return <AppHeader breadcrumbs={[list, { label: record.name, href: `${base}/${record.id}` }, { label: copy.edit }]} />
}

export async function DirectoryFormIntro({
  kind,
  edit,
}: Readonly<{ kind: 'organization' | 'contact'; edit?: boolean }>) {
  const copy = catalogFor(DIRECTORY_COPY, await loadWorkspaceLocale())
  const organization = kind === 'organization'
  const titles = organization ? [copy.newOrganization, copy.editOrganization] : [copy.newContact, copy.editContact]
  return (
    <PageHeader
      title={edit ? titles[1] : titles[0]}
      description={organization ? copy.introOrganization : copy.introContact}
    />
  )
}
