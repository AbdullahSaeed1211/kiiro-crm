import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { stripAnsi } from './exec.ts'
import { isRecord } from './schema.ts'
import { readText } from './repo.ts'
import { codeSpans } from './table.ts'
import { isFailure, type Gate } from './attempts.ts'

/** A gate to run: its recorded name and the shell command. */
export interface GateSpec {
  name: string
  command: string
}

/** A gate result with its full output, kept in memory only. */
export interface GateRun extends Gate {
  output: string
}

export const SCOPE_GATE = 'check:scope'
const MAX_FAILING_LINES = 20
const RUNNABLE = new Set(['pnpm', 'node', 'npx', 'tsx', 'vitest', 'sh', 'bash'])
/** Long-running or recursive commands that record must never execute. */
const NEVER_RUN = new Set(['dev', 'preview', 'start', 'harness:record'])
const PNPM_FLAGS_WITH_VALUE = new Set(['--filter', '-F', '-C', '--dir'])

function stripPnpmFlags(tokens: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? ''
    if (PNPM_FLAGS_WITH_VALUE.has(token)) i += 1
    else if (out.length > 0 || !token.startsWith('-')) out.push(token)
  }
  return out
}

/** The script a command runs: `pnpm --filter web build` → `build`, `pnpm vitest run x` → `test`. */
export function scriptName(command: string): string {
  const tokens = command.trim().split(/\s+/)
  let rest = tokens[0] === 'pnpm' ? stripPnpmFlags(tokens.slice(1)) : tokens
  if (['exec', 'run', 'npx'].includes(rest[0] ?? '')) rest = rest.slice(1)
  const head = rest[0] ?? ''
  return head === 'vitest' ? 'test' : head
}

/** Backticked commands in an acceptance cell that record can run unattended. */
export function acceptanceCommands(acceptance: string): string[] {
  return codeSpans(acceptance).filter((span) => {
    const first = span.trim().split(/\s+/)[0] ?? ''
    return RUNNABLE.has(first) && !NEVER_RUN.has(scriptName(span))
  })
}

export function readScripts(root: string): Record<string, string> {
  const pkg: unknown = JSON.parse(readText(join(root, 'package.json')))
  const scripts = isRecord(pkg) ? pkg['scripts'] : undefined
  if (!isRecord(scripts)) return {}
  return Object.fromEntries(Object.entries(scripts).filter((e): e is [string, string] => typeof e[1] === 'string'))
}

/** `verify:fast` split into its `&&` steps so each gate maps to a class; check:scope runs separately. */
export function verifyFastGates(scripts: Record<string, string>): GateSpec[] {
  const body = scripts['verify:fast']
  if (body === undefined) return [{ name: 'verify:fast', command: 'pnpm verify:fast' }]
  return body
    .split('&&')
    .map((step) => step.trim())
    .filter((step) => step !== '' && scriptName(step) !== SCOPE_GATE)
    .map((step) => ({ name: /^pnpm [\w:.-]+$/.test(step) ? scriptName(step) : step, command: step }))
}

/** Why a `pnpm <script>` command cannot run in this checkout, or undefined when it can. */
export function unavailableReason(opts: {
  root: string
  command: string
  scripts: Record<string, string>
}): string | undefined {
  const name = /^pnpm ([\w:.-]+)(?:\s|$)/.exec(opts.command.trim())?.[1]
  if (name === undefined) return undefined
  const body = opts.scripts[name]
  if (body === undefined) return name.includes(':') ? `script "${name}" is not defined in package.json` : undefined
  const file = /^tsx\s+(\S+\.ts)(?:\s|$)/.exec(body)?.[1]
  return file !== undefined && !existsSync(join(opts.root, file)) ? `${file} does not exist yet` : undefined
}

const FAILURE_LINE = /\b(?:error|errors|fail|failed|failure|FAIL)\b|ERR!|✗|×|not ok/i

/** Up to 20 deciding lines: lines that look like failures, otherwise the tail of the output. */
export function failingLines(output: string): string[] {
  const lines = stripAnsi(output)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
  const matched = lines.filter((line) => FAILURE_LINE.test(line))
  const chosen = matched.length > 0 ? matched : lines.slice(-MAX_FAILING_LINES)
  return chosen.slice(0, MAX_FAILING_LINES).map((line) => line.slice(0, 500))
}

/** Paths reported by check:scope as critical failures or out-of-scope flags. */
export function parseScopeViolations(output: string): string[] {
  const pattern = /^\s*(?:FAIL|FLAG|CRITICAL|VIOLATION|OUT[- ]OF[- ]SCOPE)\b[\s:-]*(\S+)/i
  const found = stripAnsi(output)
    .split(/\r?\n/)
    .map((line) => pattern.exec(line)?.[1])
    .filter((path): path is string => path !== undefined && /[./]/.test(path))
  return [...new Set(found)]
}

function classCandidates(gate: Gate): string[] {
  const name = scriptName(gate.name)
  if (!name.startsWith('test')) return [name]
  const text = [gate.name, ...gate.failingLines].join('\n')
  const keywords: string[] = []
  if (/permission|authz|authori[sz]/i.test(text)) keywords.push('test:permissions')
  if (/isolation|tenant/i.test(text)) keywords.push('test:isolation')
  return [...keywords, name, 'test']
}

/** Suggested failure classes from failing gates (via `gateClassMap`) and reported scope violations. */
export function suggestClasses(opts: {
  gates: Gate[]
  scopeViolations: string[]
  gateClassMap: Record<string, string>
}): string[] {
  const map = opts.gateClassMap
  const classes = opts.gates.filter(isFailure).map((gate) =>
    classCandidates(gate)
      .map((candidate) => map[candidate])
      .find((cls) => cls !== undefined),
  )
  const scopeClass = opts.scopeViolations.length > 0 ? map[SCOPE_GATE] : undefined
  return [...new Set([...classes, scopeClass].filter((cls): cls is string => cls !== undefined))]
}
