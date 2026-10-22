import { TABLE_LABELS } from '../../i18n/table-labels'
import { Avatar, AvatarFallback } from '@ops/ui/components/ui/avatar'
import {
  DataTable,
  type DataTableColumn,
  type DataTablePaginationState,
  type DataTableRow,
  EmptyValue,
  paginationFor,
} from '@ops/ui/composites/DataTable'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type {
  ContactListItem,
  DirectoryPage,
  DirectorySort,
  OrganizationListItem,
  PersonSummary,
} from '../../server/crm/directory/data'
import { displayName, formatDirectorySort } from '../../server/crm/directory/data'
import { safeExternalHref } from '../../server/crm/directory/utils'
import { formatDate } from '../../i18n/format'
import { ListViewBar, type ListSort } from './list-view-bar'
import { initials } from '@ops/ui/lib/initials'
import { ListEmpty } from './ListEmpty'
import { PersonCell } from './person-cell'
import { catalogFor } from '../../i18n/locale'
import { DIRECTORY_COPY, type DirectoryCopy } from '../../i18n/directory-copy'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'

function OwnerCell({ owner, copy }: Readonly<{ owner: PersonSummary | null; copy: DirectoryCopy }>) {
  return <PersonCell name={owner?.name ?? null} empty={copy.unassigned} />
}
function DateCell({ value, locale }: Readonly<{ value: number; locale: string }>) {
  return (
    <time dateTime={new Date(value).toISOString()} className="tabular-nums text-muted-foreground">
      {formatDate(value, locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
    </time>
  )
}
interface DirectoryUrlOptions {
  readonly query: string
  readonly sort: DirectorySort
  readonly page?: number
}
function paramsFor({ query, sort, page }: DirectoryUrlOptions): string {
  const params = new URLSearchParams()
  if (query !== '') params.set('q', query)
  params.set('sort', formatDirectorySort(sort))
  if (page !== undefined) params.set('page', String(page))
  return params.toString()
}
function sortHref(path: string, options: DirectoryUrlOptions): string {
  return `${path}?${paramsFor(options)}`
}
function pagination<T>(
  result: DirectoryPage<T>,
  options: Omit<DirectoryUrlOptions, 'page'> & { readonly path: string },
): DataTablePaginationState {
  const { path, query, sort } = options
  return paginationFor({ ...result, href: (page) => `${path}?${paramsFor({ query, sort, page })}` })
}
const sortMenu = (value: DirectorySort, copy: DirectoryCopy): ListSort => ({
  value,
  options: [
    { value: 'name', label: copy.sortNameAsc },
    { value: '-name', label: copy.sortNameDesc },
    { value: '-updatedAt', label: copy.sortRecent },
    { value: 'updatedAt', label: copy.sortOldest },
  ],
})

const RECORD_LINK_CLASS = 'font-medium text-foreground hover:underline underline-offset-4'

function organizationColumns(copy: DirectoryCopy, view: DirectoryUrlOptions): DataTableColumn[] {
  const { query, sort } = view
  const nameSort = sort === 'name' ? '-name' : 'name'
  const dateSort = sort === 'updatedAt' ? '-updatedAt' : 'updatedAt'
  return [
    {
      id: 'name',
      header: copy.colName,
      sortHref: sortHref('/organizations', { query, sort: nameSort }),
      hideable: false,
    },
    { id: 'website', header: copy.colWebsite, defaultHidden: true },
    { id: 'owner', header: copy.colOwner },
    { id: 'deals', header: copy.colOpenDeals, numeric: true },
    {
      id: 'updated',
      header: copy.colUpdated,
      sortHref: sortHref('/organizations', { query, sort: dateSort }),
      defaultHidden: true,
    },
  ]
}
function organizationRows(
  items: readonly OrganizationListItem[],
  text: Readonly<{ copy: DirectoryCopy; locale: string }>,
): DataTableRow[] {
  const { copy, locale } = text
  return items.map(({ record, owner, openDeals }) => {
    const website = record.website === null ? null : safeExternalHref(record.website)
    return {
      id: record.id,
      cells: {
        name: (
          <span className="inline-flex min-w-0 items-center gap-2.5">
            <Avatar size="sm" aria-hidden className="shrink-0 rounded-md">
              <AvatarFallback className="rounded-md text-[10px] font-semibold">{initials(record.name)}</AvatarFallback>
            </Avatar>
            <Link href={`/organizations/${record.id}`} prefetch={false} className={RECORD_LINK_CLASS}>
              {record.name}
            </Link>
          </span>
        ),
        website:
          website === null ? (
            <EmptyValue />
          ) : (
            <a
              href={website}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              {website.replace(/^https?:\/\//, '')}
              <ArrowUpRight aria-hidden className="size-3" />
            </a>
          ),
        owner: <OwnerCell owner={owner} copy={copy} />,
        deals: String(openDeals),
        updated: <DateCell value={record.updatedAt} locale={locale} />,
      },
    }
  })
}
export async function OrganizationsTable({
  result,
  query,
  sort,
}: Readonly<{ result: DirectoryPage<OrganizationListItem>; query: string; sort: DirectorySort }>) {
  const locale = await loadWorkspaceLocale()
  const copy = catalogFor(DIRECTORY_COPY, locale)
  return (
    <DataTable
      className="ops-directory-table"
      columns={organizationColumns(copy, { query, sort })}
      rows={organizationRows(result.items, { copy, locale })}
      mobileCard={{ cells: ['name', 'website', 'owner', 'deals'] }}
      toolbarStart={<ListViewBar searchLabel={copy.searchOrganizations} query={query} sort={sortMenu(sort, copy)} />}
      sort={{ id: sort.endsWith('updatedAt') ? 'updated' : 'name', desc: sort.startsWith('-') }}
      pagination={pagination(result, { path: '/organizations', query, sort })}
      labels={catalogFor(TABLE_LABELS, locale)}
      emptyState={
        <ListEmpty
          kind="organizations"
          filtered={query !== ''}
          clearHref="/organizations"
          createHref="/organizations/new"
        />
      }
    />
  )
}

function contactColumns(copy: DirectoryCopy, view: DirectoryUrlOptions): DataTableColumn[] {
  const { query, sort } = view
  const nameSort = sort === 'name' ? '-name' : 'name'
  return [
    { id: 'name', header: copy.colName, sortHref: sortHref('/contacts', { query, sort: nameSort }), hideable: false },
    { id: 'organization', header: copy.colOrganization },
    { id: 'email', header: copy.colEmail },
    { id: 'phone', header: copy.colPhone, defaultHidden: true },
    { id: 'owner', header: copy.colOwner, defaultHidden: true },
  ]
}
function contactRows(items: readonly ContactListItem[], copy: DirectoryCopy): DataTableRow[] {
  return items.map(({ record, organization, owner }) => ({
    id: record.id,
    cells: {
      name: (
        <Link href={`/contacts/${record.id}`} prefetch={false} className={RECORD_LINK_CLASS}>
          {displayName(record)}
        </Link>
      ),
      organization:
        organization === null ? (
          <EmptyValue />
        ) : (
          <Link
            href={`/organizations/${organization.id}`}
            prefetch={false}
            className="text-muted-foreground hover:text-foreground"
          >
            {organization.name}
          </Link>
        ),
      email:
        record.email === null ? (
          <EmptyValue />
        ) : (
          <a href={`mailto:${record.email}`} className="text-muted-foreground hover:text-foreground">
            {record.email}
          </a>
        ),
      phone:
        record.phone === null ? (
          <EmptyValue />
        ) : (
          <a href={`tel:${record.phone}`} className="text-muted-foreground hover:text-foreground">
            {record.phone}
          </a>
        ),
      owner: <OwnerCell owner={owner} copy={copy} />,
    },
  }))
}
export async function ContactsTable({
  result,
  query,
  sort,
}: Readonly<{ result: DirectoryPage<ContactListItem>; query: string; sort: DirectorySort }>) {
  const locale = await loadWorkspaceLocale()
  const copy = catalogFor(DIRECTORY_COPY, locale)
  return (
    <DataTable
      className="ops-directory-table"
      columns={contactColumns(copy, { query, sort })}
      rows={contactRows(result.items, copy)}
      mobileCard={{ cells: ['name', 'organization', 'email', 'owner'] }}
      toolbarStart={<ListViewBar searchLabel={copy.searchContacts} query={query} sort={sortMenu(sort, copy)} />}
      sort={{ id: 'name', desc: sort.startsWith('-') }}
      pagination={pagination(result, { path: '/contacts', query, sort })}
      labels={catalogFor(TABLE_LABELS, locale)}
      emptyState={
        <ListEmpty kind="contacts" filtered={query !== ''} clearHref="/contacts" createHref="/contacts/new" />
      }
    />
  )
}
