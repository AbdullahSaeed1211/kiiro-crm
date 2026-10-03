import {
  createDocumentSchema,
  invoiceFromQuoteSchema,
  statusChangeSchema,
  updateDocumentSchema,
} from '@ops/module-billing'
import type { ApiContract } from './contract-types'

/** Quotes and invoices. Owners and managers only. */
export const BILLING_CONTRACTS = {
  'billing.list': {
    method: 'GET',
    path: '/api/v1/billing',
    summary: 'Quotes and invoices, newest first; ?kind=quote|invoice, ?status=, ?organizationId=, ?page=&limit=.',
    success: 200,
  },
  'billing.get': { method: 'GET', path: '/api/v1/billing/:id', summary: 'One quote or invoice.', success: 200 },
  'billing.create': {
    method: 'POST',
    path: '/api/v1/billing',
    summary: 'Create a draft quote or invoice. Money is in minor units, quantity in thousandths, tax in basis points.',
    body: createDocumentSchema,
    success: 201,
  },
  'billing.update': {
    method: 'PATCH',
    path: '/api/v1/billing/:id',
    summary: 'Edit a draft.',
    body: updateDocumentSchema.omit({ id: true }),
    success: 200,
  },
  'billing.status': {
    method: 'POST',
    path: '/api/v1/billing/:id/status',
    summary: 'Move a document to sent, accepted, declined, paid or void, where its kind allows it.',
    body: statusChangeSchema.omit({ id: true }),
    success: 200,
  },
  'billing.invoice': {
    method: 'POST',
    path: '/api/v1/billing/:id/invoice',
    summary: 'Copy an accepted quote into a draft invoice.',
    body: invoiceFromQuoteSchema.omit({ quoteId: true }),
    success: 201,
  },
} satisfies Record<string, ApiContract>
