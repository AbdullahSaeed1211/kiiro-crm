import { spawn } from 'node:child_process'
import { isMain } from './lib/report'
import { localDevEnvironment, WEB_DIR } from './seed/local-env'

const DEV_COMMAND = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const DEV_ARGS = ['--filter', 'web', 'dev'] as const

/** Starts the normal web development command with local vars loaded into its environment. */
export function runDev(env: Readonly<Record<string, string | undefined>> = process.env): Promise<number> {
  const child = spawn(DEV_COMMAND, DEV_ARGS, {
    cwd: process.cwd(),
    env: localDevEnvironment(WEB_DIR, env),
    stdio: 'inherit',
  })
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => {
      resolve(code ?? 1)
    })
  })
}

if (isMain(import.meta.url)) {
  runDev().then(
    (code) => {
      process.exitCode = code
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
