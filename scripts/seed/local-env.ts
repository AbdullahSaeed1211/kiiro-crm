import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

type Env = Readonly<Record<string, string | undefined>>

/** Directory of the web app whose local database the scripts manage. */
export const WEB_DIR = resolve(import.meta.dirname, '../../apps/web')

/** Why a local-only script must not run in `env`, or `undefined` when it may. */
export function remoteSettingOf(env: Env): string | undefined {
  if (env['NODE_ENV'] === 'production') return 'NODE_ENV is production'
  if (env['CLOUDFLARE_ENV'] !== undefined) return 'CLOUDFLARE_ENV is set'
  if (env['PAYLOAD_REMOTE_BINDINGS'] !== undefined) return 'PAYLOAD_REMOTE_BINDINGS is set'
  return undefined
}

/** Throws when `env` points at production or remote Cloudflare resources. */
export function assertLocalOnly(env: Env): void {
  const reason = remoteSettingOf(env)
  if (reason !== undefined) throw new Error(`refusing to touch the local database: ${reason}`)
}

const QUOTED = /^(["'])(.*)\1$/

const devVarsPath = (webDir: string): string | undefined =>
  ['.dev.vars', '.dev.vars.example'].map((name) => join(webDir, name)).find((path) => existsSync(path))

const devVarEntry = (line: string): [string, string] => {
  const at = line.indexOf('=')
  const value = line.slice(at + 1).trim()
  return [line.slice(0, at).trim(), value.replace(QUOTED, '$2')]
}

/** Parses the `KEY=value` lines of a `.dev.vars` file; quotes around a value are removed. */
export function parseDevVars(text: string): Map<string, string> {
  const lines = text.split('\n').map((line) => line.trim())
  return new Map(lines.filter((line) => line.includes('=') && !line.startsWith('#')).map(devVarEntry))
}

/** Merges local development vars with the process environment; explicit process values win. */
export function localDevEnvironment(webDir: string, env: Env): Env {
  const file = devVarsPath(webDir)
  if (file === undefined) {
    throw new Error(
      `local development vars are missing; create ${join(webDir, '.dev.vars')} from ${join(webDir, '.dev.vars.example')} and retry pnpm dev`,
    )
  }
  const merged = { ...Object.fromEntries(parseDevVars(readFileSync(file, 'utf8'))), ...env }
  if (merged['PAYLOAD_SECRET'] === undefined || merged['PAYLOAD_SECRET'] === '') {
    throw new Error(
      `local development vars at ${file} must define PAYLOAD_SECRET; add it to ${join(webDir, '.dev.vars')} and retry pnpm dev`,
    )
  }
  return merged
}

/** `PAYLOAD_SECRET` from `.dev.vars` in `webDir`, else from `.dev.vars.example`. */
export function localPayloadSecret(webDir: string): string {
  const file = devVarsPath(webDir)
  const secret = file === undefined ? undefined : parseDevVars(readFileSync(file, 'utf8')).get('PAYLOAD_SECRET')
  if (secret === undefined || secret === '') throw new Error(`no PAYLOAD_SECRET in ${webDir}/.dev.vars(.example)`)
  return secret
}

/** Local D1 state directory of `webDir`; throws unless it lies inside `<webDir>/.wrangler`. */
export function localD1StateDir(webDir: string): string {
  const root = resolve(webDir, '.wrangler')
  const dir = resolve(root, 'state/v3/d1')
  const inside = relative(root, dir)
  if (inside === '' || inside.startsWith('..') || inside.startsWith(sep)) throw new Error(`unsafe state path ${dir}`)
  return dir
}
