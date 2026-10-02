import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { isMain } from './lib/report'
import { WEB_DIR } from './seed/local-env'

const PACKAGE_MANAGER = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

/**
 * Runs the "outbound email is off" browser check. The app reads its mail setting from `.dev.vars`, so this writes a
 * copy with `MAIL_TRANSPORT=disabled`, runs the one spec, and then puts the original file back.
 */
export function runMailOffCheck(): number {
  const vars = join(WEB_DIR, '.dev.vars')
  const backup = join(WEB_DIR, '.dev.vars.before-mail-off')
  const hadVars = existsSync(vars)
  if (hadVars) copyFileSync(vars, backup)
  const source = hadVars ? vars : join(WEB_DIR, '.dev.vars.example')
  const lines = readFileSync(source, 'utf8')
    .split('\n')
    .filter((line) => !line.startsWith('MAIL_TRANSPORT='))
  writeFileSync(vars, [...lines, 'MAIL_TRANSPORT=disabled', ''].join('\n'))
  try {
    const result = spawnSync(
      PACKAGE_MANAGER,
      ['exec', 'playwright', 'test', 'tests/e2e/customer/parity-mail-off.spec.ts'],
      {
        stdio: 'inherit',
        env: { ...process.env, MAIL_TRANSPORT: 'disabled' },
      },
    )
    return result.status ?? 1
  } finally {
    if (hadVars) copyFileSync(backup, vars)
    else rmSync(vars, { force: true })
    rmSync(backup, { force: true })
  }
}

if (isMain(import.meta.url)) process.exitCode = runMailOffCheck()
