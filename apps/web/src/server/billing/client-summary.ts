import { listBillingPage } from '@ops/adapter-payload'
import { isOverdue } from '@ops/module-billing'
import type { RequestContext } from '../container'

export interface ClientBilling {
  readonly invoicesSent: number
  readonly invoicesOverdue: number
  readonly invoicesPaid: number
  readonly quotesSent: number
  /** Unpaid sent invoices, summed per currency. */
  readonly outstanding: readonly { readonly currency: string; readonly minor: number }[]
}

const MAX_DOCUMENTS = 200

/** Where one company's quotes and invoices stand, for the client dashboard. */
export async function loadClientBilling(context: RequestContext, organizationId: string): Promise<ClientBilling> {
  const found = await listBillingPage(context.req, {
    where: { organization: { equals: organizationId } },
    page: 1,
    limit: MAX_DOCUMENTS,
  })
  const now = Date.now()
  const invoices = found.records.filter((document) => document.kind === 'invoice')
  const unpaid = invoices.filter((document) => document.status === 'sent')
  const totals = new Map<string, number>()
  for (const document of unpaid)
    totals.set(document.currency, (totals.get(document.currency) ?? 0) + document.totalMinor)
  return {
    invoicesSent: unpaid.length,
    invoicesOverdue: unpaid.filter((document) => isOverdue(document, now)).length,
    invoicesPaid: invoices.filter((document) => document.status === 'paid').length,
    quotesSent: found.records.filter((document) => document.kind === 'quote' && document.status === 'sent').length,
    outstanding: [...totals].map(([currency, minor]) => ({ currency, minor })),
  }
}
