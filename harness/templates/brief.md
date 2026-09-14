# Brief: {{wp}} — {{title}}

- **Milestone:** {{milestone}} · **Attempt:** {{attempt}} · **Branch:** `wp/{{wp}}` from `{{milestoneBranch}}`
- **Objective:** {{objective}}
- **Spec references:** {{specRefs}}
- **Write scope:** {{writeScope}}
- **Inputs:** {{inputs}}
- **Acceptance:** {{acceptance}}; `pnpm harness:record {{wp}} --attempt {{attempt}}`
- **Boundaries:** do not change spec §0.7 critical paths; no dependency, lockfile or migration changes; follow spec §3, §5.2, §6; decide ordinary implementation details yourself and list them under choices; verify dependency APIs and shared test doubles from this exact worktree before implementation, never from a prior worker report
- **Completion:** work until the branch is clean and the evidence and report are committed; then send one DONE or BLOCKED completion notification to the lead and stop; do not require the lead to poll for status
- **Remediation:** every `fix(...)` commit and every post-review change is a harness signal; use the next append-only attempt number, confirm the root-cause classes, and map each finding to its countermeasure and evidence in the report
- **Report:** `docs/orchestration/{{milestoneLower}}/reports/{{wp}}.md` with front matter per `harness/schemas/report.schema.json`

## Known pitfalls
{{pitfalls}}

## Previous attempt findings
{{previousFindings}}
