# Harness changelog

| Date       | Change                                                                                                                                             | Lessons                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 2026-09-13 | Initial harness: config, schemas (attempt, report, lesson, eval), templates (brief, report, spike report)                                          | —                        |
| 2026-09-14 | Recorder accepts orchestrator-confirmed failure classes; briefs require dependency API and shared test-double verification from the exact worktree | M2-L2 integration review |
| 2026-09-14 | Protocol requires worker-pushed completion, forbids lead status polling, and treats every fix or post-review remediation commit as retry evidence  | M2 CRM review loop       |
| 2026-09-14 | Retro first-pass metrics now require one green, no-finding attempt; added regression coverage and completed the five M2 lesson evals               | M2 retro lessons         |
| 2026-09-14 | Corrected the first-pass regression test to match the `analyzeRetro` contract; recorded the review correction with truthful scope evidence         | M2-L2-a3                 |
| 2026-09-14 | Added a customer-auth regression lesson and executable eval for the `/login` boundary, protected redirects, and exclusion of administrative links  | M3-L1-c0ffee             |
| 2026-09-14 | Added a task-board transition regression lesson and executable eval for flattening domain stage-transition payloads before Payload writes          | M3-L1-b0a1d0             |
| 2026-09-23 | Added a settings-action eval for type-only imports that cycle through a public action barrel                                                       | M3-L1-e07ae8             |
