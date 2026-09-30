# Wave 10: Sales polish

The owner scope added on 2026-09-30: lead management is the most polished part of the product. This wave covers a lead from first contact to an onboarded client and a newsletter subscriber.

## Tasks

1. **Lead list.** One view bar (search, status, owner, source, created date, saved views); bulk assign, bulk stage move and bulk archive through `DataTable` selection; a phone card layout.
2. **Pipeline board.** Column totals and counts, add-to-column, drag with rollback, stale-lead marker, lost-reason dialog shared with deals.
3. **Lead record.** Inline edit for every field, status and stage in one control, next-action date with an overdue marker, duplicate warning, activity feed.
4. **Lead notes.** Notes with author and time, edit and delete by the author, pinned note, mentions of staff.
5. **Lead status.** Move lead-move legality into the CRM module (W5-1); status changes write activity and can require fields through stage requirements.
6. **Lead to onboarding.** Convert to contact, organization and deal attaching to existing records; a won deal starts the tenant's onboarding playbook (project and tasks) and records the link on the lead.
7. **Newsletter.** A subscriber list with per-contact consent and source, subscribe from intake forms, unsubscribe link, and a campaign send. Blocked on the outbound email decision (`email.enabled` is false for the first tenant); until then, subscribers and consent are stored and exportable.

## Order

Tasks 1 to 6 in that order after the current batch (details, deal, convert, notes, quick-create) is released as v0.9.0. Task 7 starts when the owner confirms outbound email.

Done when: every task is verified in the running app on a phone width and on desktop, and released to the production tenant.
