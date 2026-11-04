# Navigation and app shell

How a person moves around the product: the sidebar, the header, the command menu and the keyboard. [Spec §16](../spec.md#16-app-shell--sidebar) is the authoritative contract; this page records the model behind it and why it is shaped this way.

## Principles

- **One list of destinations.** The sidebar, the command menu, the `g` shortcuts, the shortcuts dialog and the header's section name all read one model, `navSections` in `apps/web/src/app/(app)/app-navigation.ts`. Roles and switched-off modules are decided there and nowhere else, so a link that is hidden in the sidebar is not offered in the command menu or reachable with a key.
- **Nothing moves after the page paints.** Counts on links are positioned over the row, so they take no space. The sidebar renders the same on the server and in the browser; nothing is restored from storage after load.
- **One control per job.** Creating is one "New" menu in the header. Everything personal is one account menu in the sidebar footer. The header carries three controls: search, New, notifications.
- **Plain labels.** Group names and link names come from the tenant's terminology first, then the locale's copy.

## The model

`navSections(viewer)` returns the groups the viewer may see:

| Group     | Links                                                                     | Visible when                                                                              |
| --------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| (none)    | Today, Attendance                                                         | always; My tasks joins here when the work module is off                                   |
| Work      | My tasks, Tasks, Projects, Calendar, Content, Repeating, Team assignments | work module. Sales-profile staff see My tasks only; Team assignments is owner and manager |
| Clients   | Organizations, Contacts                                                   | crm module                                                                                |
| Sales     | Sales workspace, Leads, Deals                                             | crm module, and owner, manager or sales profile                                           |
| Utilities | Reports, Inbox, Billing                                                   | owner and manager; each link needs its module                                             |

`navEntries` flattens the groups. `createLinks(viewer)` lists what the New menu and the command menu's Create group offer: tasks and projects with the work module; leads with the crm module for the sales desk's people; contacts and organizations with the crm module.

Reports moved into Utilities. It used to be a group of its own with no label, which pushed Inbox and Billing below the fold on a 900 px screen.

## Shell parts

| Part          | Where                                            | Behavior                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sidebar links | `AppSidebar` in `@ops/ui`                        | Active link marked; tooltip shows the `G x` keys; optional count badge (alert tone) with a screen-reader reading                                                                                                   |
| Count badges  | `use-nav-counts.ts`, `GET /api/v1/nav/counts`    | My tasks shows overdue tasks assigned to you; Leads shows leads waiting on you. Both are the queues Today shows. Counts load after the page and refresh when the tab is shown again; collapsed sidebar shows a dot |
| Account menu  | `account-menu.tsx`                               | Profile, Settings, Keyboard shortcuts, Theme (Light, Dark, System), Log out. Replaces three stacked rows                                                                                                           |
| New menu      | `create-menu.tsx`                                | Task, project, lead, contact, organization, filtered by `createLinks`                                                                                                                                              |
| Breadcrumb    | `AppHeader`                                      | Top-level pages show their group first ("Sales › Leads"); records show at most three levels                                                                                                                        |
| Tab title     | `use-frame-effects.ts`                           | A record page reports its title, so the tab reads "Acme Ltd · Workspace" instead of the section name                                                                                                               |
| Command menu  | `workspace-search.tsx`, `workspace-commands.tsx` | Go to (from the model), Create (from `createLinks`), Records (search), Actions                                                                                                                                     |
| Shortcuts     | `workspace-shortcuts.ts`                         | `g` then a letter, from each link's `shortcut`                                                                                                                                                                     |

### Go-to keys

`G D` Today · `G A` Attendance · `G M` My tasks · `G T` Tasks · `G P` Projects · `G C` Calendar · `G O` Organizations · `G K` Contacts · `G W` Sales workspace · `G L` Leads · `G E` Deals · `G U` Team assignments · `G R` Reports · `G I` Inbox · `G B` Billing. A key does nothing when the viewer has no such link.

## Decisions

- **Folding sidebar groups was not built.** A fold state restored from browser storage changes the sidebar after it paints, which is layout shift on every page. With Reports merged into Utilities and a one-row footer, all links fit at 900 px and the content area scrolls beyond that.
- **No mobile tab bar.** A fixed bottom bar competes with sticky page actions and long lists. The header's menu button and New menu reach every page on a phone.
- **No recent records list.** It needs per-browser history that the person never asked for, and search already finds a record in two keystrokes.
- **Counts are fetched by the browser, not rendered by the layout.** A Next layout does not re-render on client navigation, so a count rendered there would go stale until a reload. The fetch is the same pattern as the notification bell.
- **Theme moved from the header to the account menu.** Appearance is set rarely; the header keeps only what is used daily.

## Adding a destination

1. Add a `{ key, href, icon, shortcut? }` link to the right list in `app-navigation.ts`, and gate it in `sectionLinks`.
2. Add its label to `SHELL_COPY` in `i18n/config.ts` (an `en` and an `es` entry).
3. Pick an unused go-to letter; `apps/web/test/shell/navigation.test.ts` fails on duplicates.
4. For a count, return it from `loadNavCounts` and give `use-shell-navigation.ts` its label.

## Verified

2026-11-04, local dev server, seeded demo data:

- Owner sidebar at 1440×900 shows all 17 links with no clipping; staff sees 10 (no Sales, Utilities or Team assignments), and the command menu lists exactly those.
- `G O` and `G L` navigate for the owner; for staff `G L` does nothing.
- `GET /api/v1/nav/counts` returns `{ myTasks, leads }` signed in and 401 signed out.
- A lead page sets the tab title to the lead's title.
- Layout shift, measured with a `layout-shift` `PerformanceObserver` on 14 routes at 1440 and 390 px, on first load and on in-app navigation: 0.000 on every route.
- `parity-shell.spec.ts` (desktop): 9 passed, 1 skipped.
