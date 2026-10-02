import type { Metadata } from 'next'
import { ExportLink } from '../ExportLink'
import { DirectoryListHeader, OrganizationsTable } from '../directory-view'
import {
  listOrganizations,
  parseDirectoryPage,
  parseDirectorySort,
  queryValue,
} from '../../../server/crm/directory/data'
import { OrganizationCreateDialogClient } from '../quick-create/OrganizationCreateDialogClient'

export const metadata: Metadata = { title: 'Organizations' }
export const dynamic = 'force-dynamic'

export default async function OrganizationsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const query = queryValue(params.q) ?? ''
  const sort = parseDirectorySort(queryValue(params.sort))
  const result = await listOrganizations({ query, sort, page: parseDirectoryPage(queryValue(params.page)) })
  return (
    <DirectoryListHeader
      kind="organizations"
      total={result.total}
      actions={
        <>
          <ExportLink kind="organizations" />
          <OrganizationCreateDialogClient />
        </>
      }
    >
      <OrganizationsTable result={result} query={query} sort={sort} />
    </DirectoryListHeader>
  )
}
