# Wave 10: Sales polish

The owner scope added on 2026-09-30: lead management is the most polished part of the product. This wave covers a lead from first contact to an onboarded client and a newsletter subscriber.

## Tasks

1. **Lead list.** One view bar (search, status, owner, source, created date, saved views); bulk assign, bulk stage move and bulk archive through `DataTable` selection; a phone card layout.
2. **Pipeline board.** Column totals and counts, add-to-column, drag with rollback, stale-lead marker, lost-reason dialog shared with deals.
3. **Lead record.** Inline edit for every field, status and stage in one control, next-action date with an overdue marker, duplicate warning, activity feed.
4. **Lead notes.** Notes with author and time, edit and delete by the author, pinned note, mentions of staff.
5. **Lead status.** Move lead-move legality into the CRM module (W5-1); status changes write activity and can require fields through stage requirements.
6. **Lead to onboarding.** Convert to contact, organization and deal attaching to existing records; a won deal starts the tenant's onboarding playbook (project and tasks) and records the link on the lead.
7. **Newsletter.** Done: opt-in checkbox custom field on contacts, test send, send to all subscribers, signed unsubscribe link and one-click headers. Open: a public subscribe form and campaign history.

## Order

Tasks 1 to 6 shipped in v0.9.0–v0.9.3 and the core of task 7 in v0.9.4–v0.9.5, with email sent from `notify.mirchtravel.com`.

Done when: every task is verified in the running app on a phone width and on desktop, and released to the production tenant.
