import { Button } from '@ops/ui/components/ui/button'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ACTIVITY_LOG_COPY } from '../../../../i18n/activity-log-copy'
import { catalogFor } from '../../../../i18n/locale'
import { getRequestContext } from '@/server/container'
import { ACTIVITY_VERBS, describeActivity } from '../../../../server/crm/activity-text'
import { loadActivityPage, type ActivityFilters, type ActivityPage } from '../../../../server/crm/activity-log'
import { loadOwnerOptions } from '../../../../server/crm/leads/queries'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { firstParam } from '../../search-params'
import { SettingsForm, SettingsPage } from '../settings-shell'
import { DateField, Pager, Pick, type Copy } from './log-parts'
import { SecurityLog } from './security-log'

export const metadata: Metadata = { title: 'Activity' }
export const dynamic = 'force-dynamic'

const LOG_PATH = '/settings/activity'
const ROUTES: ReadonlyMap<string, string> = new Map([
  ['lead', '/leads'],
  ['deal', '/deals'],
  ['contact', '/contacts'],
  ['organization', '/organizations'],
  ['project', '/projects'],
  ['task', '/tasks'],
])

const when = (time: number): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(time) + ' UTC'

type Params = Record<string, string | string[] | undefined>
type People = Awaited<ReturnType<typeof loadOwnerOptions>>

function filtersOf(params: Params): ActivityFilters {
  const pick = (name: string): string => firstParam(params[name]) ?? ''
  return { actor: pick('actor'), recordType: pick('type'), verb: pick('event'), from: pick('from'), to: pick('to') }
}

/** The filters as a query string, without the page number. */
function queryOf(filters: ActivityFilters): string {
  const query = new URLSearchParams()
  const entries = [
    ['actor', filters.actor],
    ['type', filters.recordType],
    ['event', filters.verb],
    ['from', filters.from],
    ['to', filters.to],
  ] as const
  for (const [name, value] of entries) if (value !== undefined && value !== '') query.set(name, value)
  return query.toString()
}

function Tabs({ copy, active }: Readonly<{ copy: Copy; active: 'changes' | 'security' }>) {
  const tab = ({ id, label, href }: Readonly<{ id: 'changes' | 'security'; label: string; href: string }>) => (
    <Link
      href={href}
      aria-current={active === id ? 'page' : undefined}
      className={active === id ? 'border-b-2 border-primary pb-1 font-medium' : 'pb-1 text-muted-foreground'}
    >
      {label}
    </Link>
  )
  return (
    <nav className="flex gap-4 border-b text-sm" aria-label={copy.title}>
      {tab({ id: 'changes', label: copy.changesTab, href: LOG_PATH })}
      {tab({ id: 'security', label: copy.securityTab, href: `${LOG_PATH}?log=security` })}
    </nav>
  )
}

function FilterForm({
  copy,
  filters,
  people,
  base,
}: Readonly<{ copy: Copy; filters: ActivityFilters; people: People; base: string }>) {
  const exportHref = base === '' ? '/api/v1/export/activity' : '/api/v1/export/activity?' + base
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
      <Pick label={copy.person} name="actor" value={filters.actor ?? ''}>
        <option value="">{copy.anyPerson}</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </Pick>
      <Pick label={copy.kind} name="type" value={filters.recordType ?? ''}>
        <option value="">{copy.anyKind}</option>
        {[...ROUTES.keys()].map((kind) => (
          <option key={kind} value={kind}>
            {copy.kinds[kind] ?? kind}
          </option>
        ))}
      </Pick>
      <Pick label={copy.event} name="event" value={filters.verb ?? ''}>
        <option value="">{copy.anyEvent}</option>
        {ACTIVITY_VERBS.map((verb) => (
          <option key={verb} value={verb}>
            {describeActivity(verb)}
          </option>
        ))}
      </Pick>
      <DateField label={copy.from} name="from" value={filters.from ?? ''} />
      <DateField label={copy.to} name="to" value={filters.to ?? ''} />
      <Button type="submit" size="sm">
        {copy.apply}
      </Button>
      <Link className="text-xs underline" href={LOG_PATH}>
        {copy.clear}
      </Link>
      <a className="ml-auto text-xs underline" href={exportHref} download>
        {copy.exportCsv}
      </a>
    </form>
  )
}

function LogList({ copy, rows }: Readonly<{ copy: Copy; rows: ActivityPage['rows'] }>) {
  return (
    <ul className="divide-y text-sm">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="font-medium">{row.actor === '' ? copy.system : row.actor}</span> · {row.what}
            <span className="block text-xs text-muted-foreground">{when(row.occurredAt)}</span>
          </span>
          {ROUTES.has(row.recordType) ? (
            <Link className="text-xs underline" href={(ROUTES.get(row.recordType) ?? '') + '/' + row.recordId}>
              {copy.open.replace('{kind}', (copy.kinds[row.recordType] ?? row.recordType).toLowerCase())}
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

async function RecordChanges({ params, copy }: Readonly<{ params: Params; copy: Copy }>) {
  const context = await getRequestContext()
  const filters = filtersOf(params)
  const page = Math.max(1, Number(firstParam(params.page) ?? 1) || 1)
  const [log, people] = await Promise.all([loadActivityPage(context, { filters, page }), loadOwnerOptions(context)])
  const base = queryOf(filters)
  return (
    <SettingsForm>
      <FilterForm copy={copy} filters={filters} people={people} base={base} />
      {log.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{base === '' ? copy.nothing : copy.nothingMatches}</p>
      ) : (
        <>
          <LogList copy={copy} rows={log.rows} />
          <Pager copy={copy} page={log.page} total={log.total} base={base} path={LOG_PATH} />
        </>
      )}
    </SettingsForm>
  )
}

/** Who changed what: record changes, and a separate log of security and settings events. */
export default async function ActivitySettingsPage({ searchParams }: Readonly<{ searchParams: Promise<Params> }>) {
  const params = await searchParams
  const copy = catalogFor(ACTIVITY_LOG_COPY, await loadWorkspaceLocale())
  const security = firstParam(params.log) === 'security'
  return (
    <SettingsPage
      title={copy.title}
      description={security ? copy.securityDescription : copy.description}
      roles={['owner', 'manager']}
    >
      <Tabs copy={copy} active={security ? 'security' : 'changes'} />
      {security ? <SecurityLog params={params} copy={copy} /> : <RecordChanges params={params} copy={copy} />}
    </SettingsPage>
  )
}
