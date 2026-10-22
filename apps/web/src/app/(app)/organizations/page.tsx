import type { Metadata } from 'next'
import { DirectoryListHeader, OrganizationsTable } from '../directory-view'
import {
  listOrganizations,
  parseDirectoryPage,
  parseDirectorySort,
  queryValue,
} from '../../../server/crm/directory/data'
import { OrganizationCreateDialogClient } from '../quick-create/OrganizationCreateDialogClient'
import { OrganizationListMenu } from '../organization-list-menu'
import { getProductContext } from '../../../server/auth/context'
import { catalogFor } from '../../../i18n/locale'
import { DIRECTORY_COPY } from '../../../i18n/directory-copy'
import { EXPORT_COPY } from '../../../i18n/export-copy'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'

export const metadata: Metadata = { title: 'Organizations' }
export const dynamic = 'force-dynamic'

export default async function OrganizationsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const query = queryValue(params.q) ?? ''
  const sort = parseDirectorySort(queryValue(params.sort))
  const [result, context, locale] = await Promise.all([
    listOrganizations({ query, sort, page: parseDirectoryPage(queryValue(params.page)) }),
    getProductContext(),
    loadWorkspaceLocale(),
  ])
  const directoryCopy = catalogFor(DIRECTORY_COPY, locale)
  const exportCopy = catalogFor(EXPORT_COPY, locale)
  return (
    <DirectoryListHeader
      kind="organizations"
      total={result.total}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <OrganizationCreateDialogClient />
          <OrganizationListMenu
            canImportExport={context.actor.role === 'owner' || context.actor.role === 'manager'}
            moreLabel={directoryCopy.more}
            importLabel={exportCopy.importLink}
            exportLabel={exportCopy.link}
          />
        </div>
      }
    >
      <OrganizationsTable result={result} query={query} sort={sort} />
    </DirectoryListHeader>
  )
}
