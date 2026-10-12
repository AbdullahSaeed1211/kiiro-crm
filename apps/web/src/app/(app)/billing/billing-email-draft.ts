import { lineNetMinor } from '@ops/module-billing'
import type { BillingCopy } from '../../../i18n/billing-copy'
import type { BillingView } from '../../../server/billing/queries'
import { formatMoney } from './money'

export interface EmailDraft {
  readonly subject: string
  readonly message: string
}

/** Fills {name} placeholders in one pass, so a value that contains braces is never filled again. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/gu, (match, key: string) => values[key] ?? match)
}

/** The default subject and plain-text message for emailing a quote or invoice to the client. */
export function emailDraftFor(
  input: Readonly<{ document: BillingView['document']; copy: BillingCopy; locale: string }>,
): EmailDraft {
  const { document, copy, locale } = input
  const money = (minor: number) => formatMoney({ minor, currency: document.currency, locale })
  const isQuote = document.kind === 'quote'
  const number = { number: document.number }
  const items = document.lines.map((line) =>
    fill(copy.emailLine, {
      description: line.description,
      quantity: String(line.quantityMilli / 1000),
      price: money(line.unitPriceMinor),
      amount: money(lineNetMinor(line)),
    }),
  )
  const parts = [
    copy.emailGreeting,
    '',
    fill(isQuote ? copy.emailIntroQuote : copy.emailIntroInvoice, number),
    '',
    `${copy.lines}:`,
    ...items,
    '',
    `${copy.subtotal}: ${money(document.subtotalMinor)}`,
    `${copy.tax}: ${money(document.taxMinor)}`,
    `${copy.total}: ${money(document.totalMinor)}`,
  ]
  if (document.dueAt !== null) {
    const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(document.dueAt)
    parts.push(`${isQuote ? copy.dueQuote : copy.dueInvoice}: ${date}`)
  }
  if (document.note !== null && document.note.trim() !== '') parts.push(`${copy.note}: ${document.note}`)
  parts.push('', copy.emailClosing)
  return {
    subject: fill(isQuote ? copy.emailSubjectQuote : copy.emailSubjectInvoice, number),
    message: parts.join('\n'),
  }
}
