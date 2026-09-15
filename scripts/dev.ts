import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { isMain } from './lib/report'
import { localDevEnvironment, WEB_DIR } from './seed/local-env'

// Invoke Next directly so the wrapper owns exactly one long-lived child. A
// nested `pnpm --filter web dev` chain can orphan Next when a test runner
// terminates the outer process.
const DEV_COMMAND = process.execPath
const DEV_ARGS = [join(WEB_DIR, 'node_modules/next/dist/bin/next'), 'dev'] as const

/** Starts the normal web development command with local vars loaded into its environment. */
export function runDev(env: Readonly<Record<string, string | undefined>> = process.env): Promise<number> {
  const child = spawn(DEV_COMMAND, DEV_ARGS, {
    cwd: WEB_DIR,
    env: {
      ...localDevEnvironment(WEB_DIR, env),
      NODE_OPTIONS: env['NODE_OPTIONS'] ?? '--no-deprecation',
    },
    stdio: 'inherit',
  })
  return new Promise((resolve, reject) => {
    let settled = false
    const onSignal = (signal: NodeJS.Signals): void => {
      // Playwright (and Ctrl-C) signal this wrapper, not necessarily the
      // package-manager child. Forward the signal so the Next process cannot
      // survive as an orphan and keep port 3000 occupied between runs.
      if (!child.killed) child.kill(signal)
    }
    const cleanup = (): void => {
      process.off('SIGINT', onSigint)
      process.off('SIGTERM', onSigterm)
    }
    const onSigint = (): void => {
      onSignal('SIGINT')
    }
    const onSigterm = (): void => {
      onSignal('SIGTERM')
    }

    process.once('SIGINT', onSigint)
    process.once('SIGTERM', onSigterm)
    child.once('error', (error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    })
    child.once('exit', (code, signal) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(signal === null ? (code ?? 1) : 128)
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
