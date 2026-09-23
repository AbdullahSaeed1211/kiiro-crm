import type { Metadata } from 'next'
import { DirectoryListHeader, ContactsTable } from '../directory-view'
import { listContacts, parseDirectoryPage, parseDirectorySort, queryValue } from '../../../server/crm/directory/data'

export const metadata: Metadata = { title: 'Contacts' }
export const dynamic = 'force-dynamic'

export default async function ContactsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const query = queryValue(params.q) ?? ''
  const sort = parseDirectorySort(queryValue(params.sort))
  const result = await listContacts({ query, sort, page: parseDirectoryPage(queryValue(params.page)) })
  return (
    <DirectoryListHeader kind="contacts" total={result.total}>
      <ContactsTable result={result} query={query} sort={sort} />
    </DirectoryListHeader>
  )
}
