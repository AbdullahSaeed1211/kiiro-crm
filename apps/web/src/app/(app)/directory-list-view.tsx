import { Avatar, AvatarFallback } from '@ops/ui/components/ui/avatar'
import { Button } from '@ops/ui/components/ui/button'
import {
  DataTable,
  type DataTableColumn,
  type DataTableLabels,
  type DataTablePaginationState,
  type DataTableRow,
} from '@ops/ui/composites/DataTable'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { ArrowUpRight, Building2, Contact } from 'lucide-react'
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
import { DirectoryFilters } from './directory-filters'
import { initials } from '@ops/ui/lib/initials'

const TABLE_LABELS: DataTableLabels = {
  selectAll: 'Select all',
  selectRow: 'Select row',
  columns: 'Columns',
  previous: 'Previous',
  next: 'Next',
  range: '{from}–{to} of {total}',
  selected: '{count} selected',
}
function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}
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
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const href = (page: number) => `${path}?${paramsFor({ query, sort, page })}`
  return {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    ...(result.page > 1 ? { previousHref: href(result.page - 1) } : {}),
    ...(result.page < pages ? { nextHref: href(result.page + 1) } : {}),
  }
}
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
      toolbarStart={<DirectoryFilters query={query} kind="organizations" sort={sort} />}
      sort={{ id: sort.endsWith('updatedAt') ? 'updated' : 'name', desc: sort.startsWith('-') }}
      pagination={pagination(result, { path: '/organizations', query, sort })}
      labels={TABLE_LABELS}
      emptyState={
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Add the companies your team is building relationships with."
          action={
            <Button nativeButton={false} render={<Link href="/organizations/new">New organization</Link>}>
              New organization
            </Button>
          }
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
      toolbarStart={<DirectoryFilters query={query} kind="contacts" sort={sort} />}
      sort={{ id: 'name', desc: sort.startsWith('-') }}
      pagination={pagination(result, { path: '/contacts', query, sort })}
      labels={TABLE_LABELS}
      emptyState={
        <EmptyState
          icon={Contact}
          title="No contacts yet"
          description="Add the people who help your organizations move forward."
          action={
            <Button nativeButton={false} render={<Link href="/contacts/new">New contact</Link>}>
              New contact
            </Button>
          }
        />
      }
    />
  )
}
