import { Button } from '@ops/ui/components/ui/button'
import Link from 'next/link'
import { AUDIT_VERBS, describeAudit } from '../../../../server/audit/audit-text'
import { loadAuditPage, type AuditFilters, type AuditPage } from '../../../../server/audit/audit-log'
import { getRequestContext } from '@/server/container'
import { loadOwnerOptions } from '../../../../server/crm/leads/queries'
import { firstParam } from '../../search-params'
import { SettingsForm } from '../settings-shell'
import { DateField, Pager, Pick, type Copy } from './log-parts'

const SECURITY_PATH = '/settings/activity'
type Params = Record<string, string | string[] | undefined>

const when = (time: number): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(time) + ' UTC'

function filtersOf(params: Params): AuditFilters {
  const pick = (name: string): string => firstParam(params[name]) ?? ''
  return { actor: pick('actor'), verb: pick('event'), from: pick('from'), to: pick('to') }
}

/** The filters as a query string that keeps the security view, without the page number. */
function queryOf(filters: AuditFilters): string {
  const query = new URLSearchParams({ log: 'security' })
  for (const [name, value] of [
    ['actor', filters.actor],
    ['event', filters.verb],
    ['from', filters.from],
    ['to', filters.to],
  ] as const) {
    if (value !== undefined && value !== '') query.set(name, value)
  }
  return query.toString()
}

function Events({ copy, log, base }: Readonly<{ copy: Copy; log: AuditPage; base: string }>) {
  if (log.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {base === 'log=security' ? copy.nothingSecurity : copy.nothingMatches}
      </p>
    )
  }
  return (
    <>
      <ul className="divide-y text-sm">
        {log.rows.map((row) => (
          <li key={row.id} className="py-2">
            <span className="font-medium">{row.actor === '' ? copy.system : row.actor}</span> · {row.what}
            {row.summary === '' ? null : <span className="text-muted-foreground"> · {row.summary}</span>}
            <span className="block text-xs text-muted-foreground">{when(row.occurredAt)}</span>
          </li>
        ))}
      </ul>
      <Pager copy={copy} page={log.page} total={log.total} base={base} path={SECURITY_PATH} />
    </>
  )
}

/** The security and settings events, newest first, with filters and paging. */
export async function SecurityLog({ params, copy }: Readonly<{ params: Params; copy: Copy }>) {
  const context = await getRequestContext()
  const filters = filtersOf(params)
  const page = Math.max(1, Number(firstParam(params.page) ?? 1) || 1)
  const [log, people] = await Promise.all([loadAuditPage(context, { filters, page }), loadOwnerOptions(context)])
  const base = queryOf(filters)
  return (
    <SettingsForm>
      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="log" value="security" />
        <Pick label={copy.person} name="actor" value={filters.actor ?? ''}>
          <option value="">{copy.anyPerson}</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Pick>
        <Pick label={copy.event} name="event" value={filters.verb ?? ''}>
          <option value="">{copy.anyEvent}</option>
          {AUDIT_VERBS.map((verb) => (
            <option key={verb} value={verb}>
              {describeAudit(verb)}
            </option>
          ))}
        </Pick>
        <DateField label={copy.from} name="from" value={filters.from ?? ''} />
        <DateField label={copy.to} name="to" value={filters.to ?? ''} />
        <Button type="submit" size="sm">
          {copy.apply}
        </Button>
        <Link className="text-xs underline" href={`${SECURITY_PATH}?log=security`}>
          {copy.clear}
        </Link>
        <a className="ml-auto text-xs underline" href={`/api/v1/export/activity?${base}`} download>
          {copy.exportCsv}
        </a>
      </form>
      <Events copy={copy} log={log} base={base} />
    </SettingsForm>
  )
}
