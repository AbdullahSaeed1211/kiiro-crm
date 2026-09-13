import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Attempt } from '../../harness/lib/attempts.ts'
import type { CommandRequest, CommandResult, CommandRunner } from '../../harness/lib/exec.ts'

/** The real repository root (for real schemas, templates, spec and plan). */
export const REAL_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

export const SPEC_FIXTURE = `# Spec

#### M5 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M5-L1 | Lead | 0 | — | Contracts for policy (§9.10) | \`packages/platform/src/contracts/\` | \`pnpm typecheck\` succeeds |
| M5-W1 | Worker | 1 | M5-L1 | Permission policy (§9.10, §11.1) with tests | \`packages/platform/src/permissions/\`; \`packages/platform/test/permissions/\` | \`pnpm vitest run packages/platform/test/permissions\` passes; \`/tasks\` renders on \`pnpm dev\` |
| M5-W2 | Worker | 1 | M5-L1 | Board UI | \`packages/ui/src/composites/KanbanBoard/\` | \`pnpm lint\` passes |

#### M6 work packages
`

const created: string[] = []

/** Writes a file below `root`, creating parent directories. */
export function writeFile(root: string, rel: string, content: string): string {
  const file = join(root, rel)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
  return file
}

/** A throwaway repository with the real harness schemas, templates and config plus a fixture spec. */
export function makeRepo(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'harness-test-'))
  created.push(root)
  for (const rel of ['harness/schemas', 'harness/templates', 'harness/config.yaml']) {
    cpSync(join(REAL_ROOT, rel), join(root, rel), { recursive: true })
  }
  const scripts = {
    'verify:fast': 'pnpm format:check && pnpm typecheck && vitest run --changed',
    'check:scope': 'tsx scripts/check-scope.ts',
  }
  writeFile(root, 'package.json', JSON.stringify({ name: 'fixture', scripts }))
  writeFile(root, 'docs/spec.md', SPEC_FIXTURE)
  for (const [rel, content] of Object.entries(files)) writeFile(root, rel, content)
  return root
}

export function cleanupRepos(): void {
  for (const root of created.splice(0)) rmSync(root, { recursive: true, force: true })
}

/** An injected runner answering from `handler`; records every command it receives. */
export function fakeRunner(handler: (request: CommandRequest) => Partial<CommandResult> = () => ({})): {
  run: CommandRunner
  calls: string[]
} {
  const calls: string[] = []
  const run: CommandRunner = (request) => {
    calls.push(request.command)
    return Promise.resolve({ exitCode: 0, output: '', durationMs: 5, ...handler(request) })
  }
  return { run, calls }
}

/** A valid attempt with overrides. */
export function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    wp: 'M5-W1',
    milestone: 'M5',
    attempt: 1,
    runner: 'worker',
    startedAt: '2026-09-13T10:00:00.000Z',
    finishedAt: '2026-09-13T10:05:00.000Z',
    gates: [{ name: 'lint', exitCode: 0, durationMs: 1000, failingLines: [] }],
    scopeViolations: [],
    filesChanged: 3,
    suggestedClasses: [],
    confirmedClasses: [],
    leadTookOver: false,
    ...overrides,
  }
}

/** Writes an attempt file named like record does. */
export function writeAttempt(root: string, data: Attempt): void {
  const suffix = data.runner === 'lead' ? '-lead' : ''
  writeFile(root, `harness/metrics/attempts/${data.wp}-a${String(data.attempt)}${suffix}.json`, JSON.stringify(data))
}
