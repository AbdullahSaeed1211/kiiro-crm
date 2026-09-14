# Agent entrypoint

Read [`docs/spec.md`](docs/spec.md) sections 0 and 26 before planning, delegating, reviewing, or resuming work. The spec is authoritative if this routing note differs from it.

Two rules are easy to miss:

- Section 0.8 requires worker-pushed completion. A lead does not poll an active worker, its conversation, branch, or worktree for status.
- Sections 0.6 and 26 treat every `fix(...)` commit and every post-review remediation as harness evidence. The retry must preserve the findings, classify their root causes, and add evidence that the countermeasures work.
- Before any worker edit and after every resume, verify that `pwd` and `git rev-parse --show-toplevel` both resolve to the assigned worktree. Every command sets that worktree as its working directory, and every patch path starts inside it. A mismatch stops the edit.

Load the repository's technical-writing skill before changing technical documentation.
