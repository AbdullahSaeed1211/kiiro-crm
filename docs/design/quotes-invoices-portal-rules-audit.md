# Quotes, invoices, client portal, automation rules and audit log

Status: the audit log is built (Settings, Activity). Quotes, invoices, the client portal and automation rules are proposals; nothing of them is built.

## Why

An agency sells work, bills it, and reports on it to the client. Today the product tracks leads, deals, projects and tasks, then stops before the quote and the invoice, and gives the client no view of their own work. The owner also asked for a record of who changed what, and for rules that run without code. This document fixes the shape of five features and the order to build them.

## Decisions

| Question                      | Decision                                                                                                                            | Reason                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Take payments in the product? | Not in the first release. An invoice has a manual "mark paid" and an optional payment link the owner pastes in.                     | A payment processor needs the tenant's own account and keys. The invoice model keeps a place for a processor later. |
| Money model                   | Whole minor units plus a currency code per document, as deals do. A document holds one currency.                                    | Matches deals and avoids adding different currencies.                                                               |
| Tax                           | A tax rate per line, in basis points. Totals are computed on the server and stored.                                                 | Totals must not change when rates change later.                                                                     |
| Numbering                     | A per-tenant counter with a prefix (for example `INV-0001`). Numbers are never reused.                                              | Accountants expect gap-free sequences.                                                                              |
| Client portal login           | A link sent to the client contact, no password. The link carries a random token that is stored hashed, expires, and can be revoked. | Clients will not create accounts. Same pattern as invitations.                                                      |
| Portal scope                  | Read and act on that contact's own quotes and invoices, and read the status of their projects. Nothing else.                        | Smallest surface that is still useful.                                                                              |
| Automation                    | A rule is one trigger, optional conditions, and one or more actions, evaluated by the existing cron job and by record events.       | The engine reuses events and jobs that exist.                                                                       |
| Audit log                     | Extend the Activity page. Add filters, paging, CSV export and security events.                                                      | The data exists for records; security events do not.                                                                |

## Quotes and invoices

- A quote belongs to an organization and optionally a deal. It has line items (description, quantity, unit price, tax rate), a valid-until date and a note.
- Quote states: `draft`, `sent`, `accepted`, `declined`, `expired`. Only `draft` can be edited. Sending freezes the numbers.
- Accepting a quote can create an invoice with the same lines. The deal moves to a won stage only if the owner turns that setting on.
- Invoice states: `draft`, `sent`, `paid`, `void`. A `sent` invoice past its due date shows as overdue; overdue is derived, not stored.
- Each document has a print view that the browser saves as PDF. No server-side PDF engine.
- Totals, numbering and state changes live in a module use case with a zod schema, tested against the in-memory double. The Payload collections only store.
- Activity records every state change, as for other records.

## Client portal

- A staff member sends a portal link from the organization or contact page. The page lists the links sent and lets staff revoke each one.
- The portal pages live under `/portal/<token>`. They use no staff session, no sidebar and no staff API. They read through a dedicated use case that takes the token and returns only that contact's records.
- Actions on the portal: accept or decline a quote, view and print an invoice, view project status. Each action writes an activity row with the contact as the actor.
- Wrong, expired and revoked tokens give one neutral page. The portal never says which of the three it was.

## Automation rules

- Triggers: lead created, lead without a reply for N days, deal stage changed, deal won, deal lost, task overdue.
- Conditions: source, owner, stage, value above or below an amount.
- Actions: create a task (from a playbook), assign an owner, send an email template, move the stage, notify a person.
- A rule has an on or off switch and a run history (time, record, result). A failed action is recorded and does not stop the other actions.
- Rules are written in a form with pickers; no free-form code. The round-robin lead assignment that exists under Settings, Sales becomes one built-in rule type.
- Each rule run is idempotent per (rule, record, trigger time), so a repeated cron run cannot act twice.

## Audit log

- Filters: person, record type, date range, and event kind.
- Paging by cursor and a CSV export for owners and managers.
- New event kinds: role changed, member invited, revoked or deactivated, settings changed, export downloaded, API token created or revoked, portal link sent or revoked, rule changed.
- The log is append-only. Nothing in the product edits or deletes a row.
- Built: record changes and security events are two tabs on one page. Security events live in their own `auditEvents` collection, so the shared record-type list did not change. Role changes, export downloads and portal events are written by the action that does them.

## Order of work

1. Audit log: filters, paging, export, security events. Smallest, and later features write into it.
2. Quotes and invoices: module, collections, pages, print view, activity.
3. Client portal: token model, pages, quote accept.
4. Automation rules: model, form, engine, run history.
5. Payment links through a processor, only after the tenant supplies its account.

## Costs and risks

- Invoices are legal documents in many places. The product stores and prints them; it does not give tax advice.
- The portal is the first surface a non-staff person can reach. It needs its own tests for scope and token handling before release.
- Rules can loop (a rule that changes a record that triggers a rule). The engine stops a chain after a fixed depth and records it.
