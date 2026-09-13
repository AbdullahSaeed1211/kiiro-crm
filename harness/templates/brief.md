# Brief: {{wp}} — {{title}}

- **Milestone:** {{milestone}} · **Attempt:** {{attempt}} · **Branch:** `wp/{{wp}}` from `{{milestoneBranch}}`
- **Objective:** {{objective}}
- **Spec references:** {{specRefs}}
- **Write scope:** {{writeScope}}
- **Inputs:** {{inputs}}
- **Acceptance:** {{acceptance}}; `pnpm harness:record {{wp}} --attempt {{attempt}}`
- **Boundaries:** do not change spec §0.7 critical paths; no dependency, lockfile or migration changes; follow spec §3, §5.2, §6; decide ordinary implementation details yourself and list them under choices; verify dependency APIs and shared test doubles from this exact worktree before implementation, never from a prior worker report
- **Report:** `docs/orchestration/{{milestoneLower}}/reports/{{wp}}.md` with front matter per `harness/schemas/report.schema.json`

## Known pitfalls
{{pitfalls}}

## Previous attempt findings
{{previousFindings}}
