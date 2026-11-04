# Client hub

**Decision (2026-11-04):** a client is a hub inside the workspace, not a workspace of its own.

## Why not a nested workspace

Each customer already runs as an isolated tenant ([ADR-0002](../adr/0002-tenancy.md)). A second level, with a client switcher, would put hidden context on every page, double the permission rules, and break the screens that cut across clients on purpose: Today, My tasks, the calendar and the command menu. People who work for several clients would switch constantly.

## What the hub is

The client page (`/organizations/<id>`) gathers everything about one client behind tabs: Overview (contacts, leads, deals, projects, next task, readiness), Notes, Activity, Tasks, Billing, Files and Email. Every other screen can still link to it, and search finds it from anywhere.

| Tab                                            | Shows                                                                                       | Who sees it                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Overview, Notes, Activity, Tasks, Files, Email | as before                                                                                   | everyone with access to the client                      |
| Billing                                        | that client's quotes and invoices, with New quote and New invoice already set to the client | owners and managers (the same rule as the Billing page) |

Billing's list is read only while its tab is open (`?tab=billing`), so the other tabs and staff pay nothing for it.

## Parts

- `billing/client-billing-tab.tsx`: the tab.
- `billing/billing-rows.tsx`: the one list of quotes and invoices, shared with the Billing page.
- `loadBillingPage({ organizationId })`: the same query with a client filter.
- `/billing/new?organizationId=<id>`: opens the form with the client fixed.

## Not built

Pinned or recent clients in the sidebar (they would change the sidebar after it paints), a per-client file section for brand guidelines and work orders ([roadmap](../roadmap.md) wave 12), and a client portal.
