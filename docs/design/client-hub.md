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

The server builds only the open tab (`?tab=`). A click on a tab asks the server for that tab, and the page stays dimmed until it arrives (`RecordPageLayout` `serverTabs`). Each tab runs its own reads: the Overview about 18 statements, every other tab 6 or 7, where building every tab on every visit cost 28. Other record pages (contacts, leads, deals, projects) keep instant tabs because they still build every tab; Billing is built only for owners and managers.

## Overview

The Overview opens with four figures: the next due item, **Outstanding** (unpaid sent invoices per currency, with how many are overdue; owners and managers only), overdue work and items awaiting the client's response. Below them sit the client's projects, contacts and deals, each with an add link.

The owner shows once, in the header. The page has one primary button, **New task**, which opens the task form already linked to the client; Edit and Archive are secondary.

## Tasks for a client

Every way of making a task can carry a client: the client page's New task, the New task page's Client picker (and Assigned to, for owners and managers), and the Client field on a task's panel and page, which changes or clears it. Staff can assign only themselves, matching the command's rule. Today's quick add stays title-only; its task can get a client from the panel in one step.

## Parts

- `billing/client-billing-tab.tsx`: the tab.
- `billing/billing-rows.tsx`: the one list of quotes and invoices, shared with the Billing page.
- `loadBillingPage({ organizationId })`: the same query with a client filter.
- `/billing/new?organizationId=<id>`: opens the form with the client fixed.

## Client-level controls

Today a client has an owner, a source, details (website, email, phone), tenant-defined custom fields, files and an archive. A tenant that needs a per-client default (currency, payment terms, billing contact) adds it as a custom field in Settings, Fields. Not built: those defaults as first-class settings that the billing form reads, per-client visibility beyond the owner and group scope, and a client portal.

## Naming

The sidebar group is "Clients" and its first link is "Organizations", because a company can be a prospect before it is a client. A tenant that wants "Clients" there sets it in Settings, Terminology; the vertical templates carry their own words. A default rename would touch about 150 strings and is not done.

## Not built

Pinned or recent clients in the sidebar (they would change the sidebar after it paints), a per-client file section for brand guidelines and work orders ([roadmap](../roadmap.md) wave 12), and a client portal.
