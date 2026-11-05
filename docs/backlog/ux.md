# UX backlog

1 finding is open; it is minor. They come from a review of the product UI at commit `cc6b2d6`, run through the Acme Agency tenant in Chromium at 1440px and 390px and compared against the reference products in `../references/`. The atomic reference-parity inventory stays in [the reference-parity backlog](../ux/reference-parity-backlog.md); this file lists what the review found, with a fix for each.

Critical means a core workflow is broken or a staff user hits it on day one. "Quick" is about a day or less; "Structural" needs a new shared component or data model. Codes such as T-01 or R-03 group related symptoms: T tasks, B boards and calendar, R records, S shell. Numbers are stable identifiers, so gaps mean a finding was fixed. Delete a finding in the commit that fixes it.

Reference files are cited to show observed behavior. Copy code only from MIT or Apache-2.0 sources, as [AGENTS.md](../../AGENTS.md#references-and-licences) describes; re-implement the rest.

## Critical

## Major

## Minor

### 40. Open product work from the 2026-11-05 session

- Automation rules (roadmap wave 11, design in `docs/design/quotes-invoices-portal-rules-audit.md#automation-rules`): v1 is built. Owners and managers edit up to 20 rules at `/settings/automation`, a cron job evaluates them every 15 minutes, and each (rule, record, trigger time) runs once with its history on the page. Triggers cover new leads, unanswered leads, deal stage changes, won and lost deals, and overdue tasks; conditions match source, owner, stage or deal value; actions create a task, assign an owner or notify a person. Remaining: send-email-template and move-stage actions, and evaluating rules from record events instead of only from cron.
- Server error messages are English in Spanish workspaces; a shared approach is needed before changing 50 action files.
