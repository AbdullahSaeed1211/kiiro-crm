# @ops/module-billing

## Purpose

Quotes and invoices: line items, totals, numbering, and the states a document moves through.

## Public API

`createDocument`, `updateDocument`, `changeDocumentStatus` and `invoiceFromQuote` validate input, check that the actor is an owner or manager, and call the `BillingRepository` port. `computeTotals`, `isOverdue` and `isExpired` are pure and tested. A document holds one currency, whole minor units, and a tax rate per line in basis points.

## Ports

`BillingRepository` stores documents and hands out the next number for a kind. `BillingDeps` adds the actor, the permission check, the clock and an `audit` callback for the security log.

## Invariants

- Money is whole minor units of one currency per document; a quantity is in thousandths and tax is in basis points per line.
- Totals are computed on the server from the lines, summed line by line with half-up rounding; a client total is never trusted.
- Only a draft can be edited. A move must be one the document's kind allows, and a stale version is refused.
- Numbers run per kind (QUO-0001, INV-0001) and are unique in the store, which retries on a clash.
- Overdue and expired are worked out from the dates and never stored.
