import { spawnSync } from 'node:child_process'
import { isMain } from './lib/report'
import { localPayloadSecret, WEB_DIR } from './seed/local-env'
import { runDev } from './dev'

const PACKAGE_MANAGER = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function runSetup(command: string): void {
  const result = spawnSync(PACKAGE_MANAGER, [command], {
    cwd: process.cwd(),
    env: { ...process.env, PAYLOAD_SECRET: localPayloadSecret(WEB_DIR) },
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

/** Resets and seeds local D1, then owns the long-lived Next process for E2E. */
export async function runE2eServer(): Promise<number> {
  runSetup('db:reset:local')
  runSetup('seed:dev')
  return runDev()
}

if (isMain(import.meta.url)) {
  runE2eServer().then(
    (code) => {
      process.exitCode = code
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
