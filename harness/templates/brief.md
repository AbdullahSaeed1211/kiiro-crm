# Brief: {{wp}} — {{title}}

- **Milestone:** {{milestone}} · **Attempt:** {{attempt}} · **Branch:** `wp/{{wp}}` from `{{milestoneBranch}}`
- **Objective:** {{objective}}
- **Spec references:** {{specRefs}}
- **Write scope:** {{writeScope}}
- **Inputs:** {{inputs}}
- **Acceptance:** {{acceptance}}; `pnpm harness:record {{wp}} --attempt {{attempt}}`
- **UX evidence gate:** functional completion is separate from visual/interaction acceptance. Before editing, inventory each in-scope journey against named reference screens/flows, record exact source URLs and license decisions, and capture desktop plus 390 px reference screenshots with measurable typography, spacing, density, focus, responsive, and empty/loading/error constraints. After editing, attach side-by-side comparisons and add a browser-level test for each changed primary journey that performs the real user action, waits for the resulting visible state, and checks persistence where applicable; route health, lint, and unit tests alone do not satisfy this gate. For overlays, exercise each origin, backdrop, Escape, close button, footer action, browser Back/Forward, direct URL, focus return, and scroll containment. Record interaction layout-shift entries (and their window) where geometry stability is claimed. “Inspired by Twenty/Frappe” is not evidence; document deviations, and reject raw persisted IDs in customer UI. Reuse OSS code only after inspecting the exact package/component license and preserving required notices; behavior-only references do not authorize copying app-level source.
- **Boundaries:** before the first edit and after every resume, verify that `pwd` and `git rev-parse --show-toplevel` both equal the assigned worktree; set that worktree as the working directory for every command and root every patch path inside it; stop on any mismatch; do not change spec §0.7 critical paths; no dependency, lockfile or migration changes; follow spec §3, §5.2, §6; decide ordinary implementation details yourself and list them under choices; verify dependency APIs and shared test doubles from this exact worktree before implementation, never from a prior worker report
- **Completion:** work until the branch is clean and the evidence and report are committed; then send one DONE or BLOCKED completion notification to the lead and stop; do not require the lead to poll for status
- **Remediation:** every `fix(...)` commit and every post-review change is a harness signal; use the next append-only attempt number, confirm the root-cause classes, and map each finding to its countermeasure and evidence in the report
- **Report:** `docs/orchestration/{{milestoneLower}}/reports/{{wp}}.md` with front matter per `harness/schemas/report.schema.json`

## Known pitfalls
{{pitfalls}}

## Previous attempt findings
{{previousFindings}}
