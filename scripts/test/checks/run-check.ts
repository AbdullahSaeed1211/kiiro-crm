import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Repository root. */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/** Directory holding the planted check fixtures. */
export const FIXTURES = fileURLToPath(new URL('../../fixtures/checks/', import.meta.url))

/** Timeout for tests that spawn a check process. */
export const CLI_TIMEOUT = 30_000

/** Outcome of a spawned check. */
export interface CheckRun {
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
}

/** Runs `scripts/<script>` through tsx from the repository root, as the package scripts do. */
export function runCheck(script: string, args: readonly string[]): CheckRun {
  const result = spawnSync(process.execPath, ['--import', 'tsx', `scripts/${script}`, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}
