# @ops/module-billing

## Purpose

Quotes and invoices: line items, totals, numbering, and the states a document moves through.

## Public API

`createDocument`, `updateDocument`, `changeDocumentStatus` and `invoiceFromQuote` validate input, check that the actor is an owner or manager, and call the `BillingRepository` port. `computeTotals`, `isOverdue` and `isExpired` are pure and tested. A document holds one currency, whole minor units, and a tax rate per line in basis points.

## Ports

`BillingRepository` stores documents and hands out the next number for a kind. `BillingDeps` adds the actor, the permission check, the clock and an `audit` callback for the security log.
