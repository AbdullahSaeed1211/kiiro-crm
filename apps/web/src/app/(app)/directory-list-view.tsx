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
import type {
  ContactListItem,
  DirectoryPage,
  DirectorySort,
  OrganizationListItem,
  PersonSummary,
} from '../../server/crm/directory/data'
import { displayName, formatDirectorySort } from '../../server/crm/directory/data'
import { safeExternalHref } from '../../server/crm/directory/utils'

const TABLE_LABELS: DataTableLabels = {
  selectAll: 'Select all',
  selectRow: 'Select row',
  columns: 'Columns',
  previous: 'Previous',
  next: 'Next',
  range: '{from}–{to} of {total}',
  selected: '{count} selected',
}
const DATE_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}
function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
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
      {DATE_FORMAT.format(value)}
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
function linkClass(): string {
  return 'font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground'
}

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
          <a href={`/organizations/${record.id}`} className={linkClass()}>
            {record.name}
          </a>
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
      columns={organizationColumns(query, sort)}
      rows={organizationRows(result.items)}
      sort={{ id: sort.endsWith('updatedAt') ? 'updated' : 'name', desc: sort.startsWith('-') }}
      pagination={pagination(result, { path: '/organizations', query, sort })}
      labels={TABLE_LABELS}
      emptyState={
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Add the companies your team is building relationships with."
          action={
            <Button nativeButton={false} render={<a href="/organizations/new">New organization</a>}>
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
        <a href={`/contacts/${record.id}`} className={linkClass()}>
          {displayName(record)}
        </a>
      ),
      organization:
        organization === null ? (
          <EmptyValue />
        ) : (
          <a href={`/organizations/${organization.id}`} className="text-muted-foreground hover:text-foreground">
            {organization.name}
          </a>
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
      columns={contactColumns(query, sort)}
      rows={contactRows(result.items)}
      sort={{ id: 'name', desc: sort.startsWith('-') }}
      pagination={pagination(result, { path: '/contacts', query, sort })}
      labels={TABLE_LABELS}
      emptyState={
        <EmptyState
          icon={Contact}
          title="No contacts yet"
          description="Add the people who help your organizations move forward."
          action={
            <Button nativeButton={false} render={<a href="/contacts/new">New contact</a>}>
              New contact
            </Button>
          }
        />
      }
    />
  )
}
