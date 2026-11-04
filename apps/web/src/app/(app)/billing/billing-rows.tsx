import Link from 'next/link'
import type { BillingCopy } from '../../../i18n/billing-copy'
import type { BillingPage } from '../../../server/billing/queries'
import { formatMoney } from './money'
import { StatusChip } from './status-chip'

const dateOf = (time: number | null, locale: string): string =>
  time === null ? '' : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

/** Quotes and invoices as one list: number, company, due date, state and total. Used by Billing and by a client's Billing tab. */
export function BillingRows({
  copy,
  page,
  locale,
}: Readonly<{ copy: BillingCopy; page: BillingPage; locale: string }>) {
  return (
    <ul className="divide-y text-sm">
      {page.rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href={`/billing/${row.id}`} className="min-w-0 font-medium hover:underline">
            {row.number}
            <span className="block text-xs font-normal text-muted-foreground">{row.company}</span>
          </Link>
          <span className="flex items-center gap-3">
            {row.dueAt === null ? null : (
              <span className="text-xs text-muted-foreground">
                {row.kind === 'quote' ? copy.dueQuote : copy.dueInvoice}: {dateOf(row.dueAt, locale)}
              </span>
            )}
            <StatusChip status={row.shown} label={copy.states[row.shown] ?? row.shown} />
            <span className="tabular-nums">
              {formatMoney({ minor: row.totalMinor, currency: row.currency, locale })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
