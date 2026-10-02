import { DATA_TABLE_LABELS } from '../../i18n/table-labels'
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

function OwnerCell({ owner }: Readonly<{ owner: PersonSummary | null }>) {
  if (owner === null) return <span className="text-muted-foreground">Unassigned</span>
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback>{initials(owner.name)}</AvatarFallback>
      </Avatar>
      <span>{owner.name}</span>
    </span>
  )
}
function DateCell({ value }: Readonly<{ value: number }>) {
  return (
    <time dateTime={new Date(value).toISOString()} className="tabular-nums text-muted-foreground">
      {formatDate(value, undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
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
const SORT_OPTIONS = [
  { value: 'name', label: 'Name: A to Z' },
  { value: '-name', label: 'Name: Z to A' },
  { value: '-updatedAt', label: 'Recently updated' },
  { value: 'updatedAt', label: 'Least recently updated' },
] as const

const sortMenu = (value: DirectorySort): ListSort => ({ value, options: SORT_OPTIONS })

const RECORD_LINK_CLASS = 'font-medium text-foreground hover:underline underline-offset-4'

function organizationColumns(query: string, sort: DirectorySort): DataTableColumn[] {
  const nameSort = sort === 'name' ? '-name' : 'name'
  const dateSort = sort === 'updatedAt' ? '-updatedAt' : 'updatedAt'
  return [
    { id: 'name', header: 'Name', sortHref: sortHref('/organizations', { query, sort: nameSort }), hideable: false },
    { id: 'website', header: 'Website' },
    { id: 'owner', header: 'Owner' },
    { id: 'deals', header: 'Open deals', numeric: true },
    { id: 'updated', header: 'Updated', sortHref: sortHref('/organizations', { query, sort: dateSort }) },
  ]
}
function organizationRows(items: readonly OrganizationListItem[]): DataTableRow[] {
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
        owner: <OwnerCell owner={owner} />,
        deals: String(openDeals),
        updated: <DateCell value={record.updatedAt} />,
      },
    }
  })
}
export function OrganizationsTable({
  result,
  query,
  sort,
}: Readonly<{ result: DirectoryPage<OrganizationListItem>; query: string; sort: DirectorySort }>) {
  return (
    <DataTable
      className="ops-directory-table"
      columns={organizationColumns(query, sort)}
      rows={organizationRows(result.items)}
      mobileCard={{ cells: ['name', 'website', 'owner', 'deals'] }}
      toolbarStart={<ListViewBar searchLabel="Search organizations" query={query} sort={sortMenu(sort)} />}
      sort={{ id: sort.endsWith('updatedAt') ? 'updated' : 'name', desc: sort.startsWith('-') }}
      pagination={pagination(result, { path: '/organizations', query, sort })}
      labels={DATA_TABLE_LABELS}
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

function contactColumns(query: string, sort: DirectorySort): DataTableColumn[] {
  const nameSort = sort === 'name' ? '-name' : 'name'
  return [
    { id: 'name', header: 'Name', sortHref: sortHref('/contacts', { query, sort: nameSort }), hideable: false },
    { id: 'organization', header: 'Organization' },
    { id: 'email', header: 'Email' },
    { id: 'phone', header: 'Phone' },
    { id: 'owner', header: 'Owner' },
  ]
}
function contactRows(items: readonly ContactListItem[]): DataTableRow[] {
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
      owner: <OwnerCell owner={owner} />,
    },
  }))
}
export function ContactsTable({
  result,
  query,
  sort,
}: Readonly<{ result: DirectoryPage<ContactListItem>; query: string; sort: DirectorySort }>) {
  return (
    <DataTable
      className="ops-directory-table"
      columns={contactColumns(query, sort)}
      rows={contactRows(result.items)}
      mobileCard={{ cells: ['name', 'organization', 'email', 'owner'] }}
      toolbarStart={<ListViewBar searchLabel="Search contacts" query={query} sort={sortMenu(sort)} />}
      sort={{ id: 'name', desc: sort.startsWith('-') }}
      pagination={pagination(result, { path: '/contacts', query, sort })}
      labels={DATA_TABLE_LABELS}
      emptyState={
        <ListEmpty kind="contacts" filtered={query !== ''} clearHref="/contacts" createHref="/contacts/new" />
      }
    />
  )
}
