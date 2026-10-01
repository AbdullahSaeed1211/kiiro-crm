import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { isMain } from './lib/report'
import { assertSafeToDeleteLocalState, localPayloadSecret, WEB_DIR } from './seed/local-env'

function main(): void {
  const stateDir = assertSafeToDeleteLocalState(process.env, WEB_DIR)
  rmSync(stateDir, { recursive: true, force: true })
  console.log(`db:reset:local: removed ${relative(process.cwd(), stateDir)}`)
  const env = { ...process.env, NODE_OPTIONS: '--no-deprecation', PAYLOAD_SECRET: localPayloadSecret(WEB_DIR) }
  const bin = join(WEB_DIR, 'node_modules/payload/bin.js')
  const result = spawnSync(process.execPath, [bin, 'migrate'], { cwd: WEB_DIR, env, stdio: 'inherit' })
  process.exitCode = result.status ?? 1
}

if (isMain(import.meta.url)) main()
