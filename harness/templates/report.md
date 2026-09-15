---
wp: "{{wp}}"
attempt: {{attempt}}
status: DONE
filesChanged: []
acceptance: []
testsAdded: []
choices: []
openQuestions: []
---

# Report: {{wp}}

Summary of what was built and anything the lead should look at first.

## UX acceptance evidence

Record reference capture paths, desktop and 390 px screenshots, measurable deviations, and the drawer/dialog lifecycle matrix. Include typography, spacing, control density, focus states, empty/loading/error states, responsive behavior, and a raw-ID leakage check. The lead performs a visual integration pass after every parallel wave; milestone closure and GO recommendations remain blocked while any UX gate is open.

For a retry, include a **Review remediation** section. Map each lead finding to its failure class, countermeasure, verifying test or check, and remediation commit. Do not omit a finding because the final gates pass.
