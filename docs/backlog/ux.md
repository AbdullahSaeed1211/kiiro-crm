# UX backlog

2 findings are open, both minor. They come from a review of the product UI at commit `cc6b2d6`, run through the Acme Agency tenant in Chromium at 1440px and 390px and compared against the reference products in `../references/`. The atomic reference-parity inventory stays in [the reference-parity backlog](../ux/reference-parity-backlog.md); this file lists what the review found, with a fix for each.

Critical means a core workflow is broken or a staff user hits it on day one. "Quick" is about a day or less; "Structural" needs a new shared component or data model. Codes such as T-01 or R-03 group related symptoms: T tasks, B boards and calendar, R records, S shell. Numbers are stable identifiers, so gaps mean a finding was fixed. Delete a finding in the commit that fixes it.

Reference files are cited to show observed behavior. Copy code only from MIT or Apache-2.0 sources, as [AGENTS.md](../../AGENTS.md#references-and-licences) describes; re-implement the rest.

## Critical

## Major

## Minor

### 34. Closing a task panel on phones loses focus

- Area: Tasks. Effort: Quick. Codes: A-04.
- In mobile WebKit (390px), pressing Escape on a task panel opened from `/calendar` returns to the calendar, but the task link is not focused; desktop Chromium focuses it. `app-frame.tsx` focuses `[data-task-link-id]` on the pathname change, and something focuses after it. Found by `route-health.spec.ts` "task details preserve origin", which fails on the mobile project at `v0.2.0`.
- Status: fix applied, not yet verified in WebKit. Safari does not focus a tapped link, so the dialog's default focus return lands on the page body after our effect. `TaskSheet` now passes `finalFocus` to focus the task's visible link directly. Chromium passes with and without the fix; WebKit could not be downloaded in the sandbox. Run the mobile project to close this.

### 40. Open product work from the 2026-11-05 session

- Automation rules (roadmap wave 11, design in `docs/design/quotes-invoices-portal-rules-audit.md#automation-rules`): not started.
- README screenshots: retake with `scripts/screenshots.ts` to show the client portal, the portal card on a client's Billing tab and the new type settings; the feature table already lists the portal.
- UX 34 needs one run of the mobile (WebKit) Playwright project to close.
- Server error messages are English in Spanish workspaces; a shared approach is needed before changing 50 action files.
