import { spawn } from 'node:child_process'

/** Result returned by an operations command runner. */
export interface CommandResult {
  readonly exitCode: number
  readonly output: string
}

/** Wrangler executable resolved from the web package, which pins the supported CLI version. */
export const WRANGLER = 'pnpm --filter web exec wrangler'
export const OPENNEXT = 'pnpm --filter web exec opennextjs-cloudflare'

/** Validates a value before it is interpolated into a shell command. */
export function assertSafeToken(value: string, label: string, pattern: RegExp): string {
  if (!pattern.test(value)) throw new Error(`${label} contains unsupported characters`)
  return value
}

/** Checks a planned Wrangler command against a captured help document without contacting Cloudflare. */
export function commandSupportedByHelp(command: string, help: string): boolean {
  const args = command.split(/\s+/).slice(command.split(/\s+/).lastIndexOf('wrangler') + 1)
  const header =
    help
      .split('\n')
      .find((line) => line.startsWith('wrangler '))
      ?.trim() ?? ''
  const firstFlag = args.findIndex((token) => token.startsWith('--'))
  const path = args.slice(0, firstFlag === -1 ? args.length : firstFlag).join(' ')
  const flags = args.filter((token) => token.startsWith('--'))
  const placeholderStart = header.lastIndexOf(' [')
  const documentedPath = placeholderStart >= 0 && header.endsWith(']') ? header.slice(0, placeholderStart) : header
  return (
    (`wrangler ${path}` === documentedPath || `wrangler ${path}`.startsWith(`${documentedPath} `)) &&
    flags.every((flag) => help.includes(flag))
  )
}

/** Injectable command runner used by provisioning and deployment tests. */
export type CommandRunner = (
  command: string,
  env?: Readonly<Record<string, string | undefined>>,
) => Promise<CommandResult>

/** Runs a command through the local shell and captures stdout and stderr together. */
export function shellRunner(cwd: string): CommandRunner {
  return (command, extraEnv = {}) =>
    new Promise((resolvePromise) => {
      const child = spawn(command, { cwd, env: { ...process.env, ...extraEnv }, shell: true })
      const chunks: string[] = []
      const collect = (data: Buffer): void => {
        chunks.push(data.toString('utf8'))
      }
      child.stdout.on('data', collect)
      child.stderr.on('data', collect)
      child.on('error', (error) => {
        resolvePromise({ exitCode: 127, output: `${chunks.join('')}${error.message}` })
      })
      child.on('close', (code) => {
        resolvePromise({ exitCode: code ?? 1, output: chunks.join('') })
      })
    })
}

/** A command runner that records commands and returns successful dry-run output. */
export function dryRunRunner(print: (line: string) => void): CommandRunner {
  return (command) => {
    print(`DRY RUN command: ${command}`)
    return Promise.resolve({ exitCode: 0, output: 'bookmark: dry-run-bookmark' })
  }
}

/** Extracts a D1 database id from Wrangler's human or JSON output. */
export function parseD1Id(output: string): string | undefined {
  const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.exec(output)?.[0]
  return uuid
}

/** Finds a named resource and its UUID in Wrangler list output. */
export function resourceId(output: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const nearby = new RegExp(`.{0,120}${escaped}.{0,120}`, 'is').exec(output)?.[0]
  return nearby === undefined ? undefined : parseD1Id(nearby)
}

/** Returns true only when a named table cell or JSON name exactly matches the requested resource. */
export function hasExactResourceName(output: string, name: string): boolean {
  const parsed = parseJsonArray(output)
  if (parsed !== undefined)
    return parsed.some((entry) => typeof entry === 'object' && entry !== null && entryName(entry) === name)
  return output.split('\n').some((line) => {
    const normalized = line.trim()
    if (normalized === '' || /^(error|warning|failed)\b/i.test(normalized)) return false
    return normalized.split(/\s{2,}|\t/).some((cell) => cell.trim() === name)
  })
}

/** Parses a strict Wrangler JSON list into exact resource names; malformed output is never treated as success. */
export function exactJsonNames(output: string): string[] {
  const parsed = parseJsonArray(output)
  return parsed === undefined
    ? []
    : parsed.flatMap((entry) => (typeof entry === 'object' && entry !== null ? [entryName(entry)] : []))
}

/** Accepts only an exact configured sender domain with a verified/active status. */
export function senderStatusReady(output: string, expectedDomain: string): boolean {
  const parsed = parseJsonArray(output)
  if (parsed !== undefined) {
    return parsed.some((entry) => {
      if (typeof entry !== 'object' || entry === null) return false
      const record = entry as Record<string, unknown>
      const domain = record['domain'] ?? record['name']
      const status = record['status'] ?? record['state']
      return domain === expectedDomain && typeof status === 'string' && /^(active|enabled|verified)$/i.test(status)
    })
  }
  return output.split('\n').some((line) => {
    const normalized = line.trim()
    if (normalized === '' || /^(error|warning|failed)\b/i.test(normalized)) return false
    const cells = normalized.split(/\s{2,}|\t/).map((cell) => cell.trim())
    return cells.includes(expectedDomain) && cells.some((cell) => /^(active|enabled|verified)$/i.test(cell))
  })
}

function parseJsonArray(output: string): unknown[] | undefined {
  try {
    const value: unknown = JSON.parse(output.trim())
    return Array.isArray(value) ? value : undefined
  } catch {
    return undefined
  }
}

function entryName(entry: object): string {
  const value = (entry as Record<string, unknown>)['name']
  return typeof value === 'string' ? value : ''
}

/** Extracts a D1 time-travel bookmark from Wrangler output. */
export function parseBookmark(output: string): string | undefined {
  const json = parseJsonBookmark(output)
  if (json !== undefined) return json
  return /\b(?:bookmark|latestBookmark)\s*[:=]\s*([^\s]+)/i.exec(output)?.[1]
}

function parseJsonBookmark(output: string): string | undefined {
  let value: unknown
  try {
    value = JSON.parse(output)
  } catch {
    return undefined
  }
  if (typeof value !== 'object' || value === null) return undefined
  for (const key of ['bookmark', 'latestBookmark', 'id']) {
    const candidate = (value as Record<string, unknown>)[key]
    if (typeof candidate === 'string' && candidate !== '') return candidate
  }
  return undefined
}

/** Throws a compact error when an operations command fails. */
export function assertCommand(result: CommandResult, command: string): void {
  if (result.exitCode !== 0)
    throw new Error(`${command} failed (exit ${String(result.exitCode)}): ${result.output.trim()}`)
}
