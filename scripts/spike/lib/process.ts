import { spawnSync } from 'node:child_process'

/** A program and its arguments, run without a shell. */
export interface CommandSpec {
  readonly file: string
  readonly args: readonly string[]
}

/** Exit code and combined stdout plus stderr of a finished command. */
export interface CommandOutput {
  readonly code: number
  readonly output: string
}

const SAFE_ARG = /^[\w@%+=:,./-]+$/
const ESCAPED_QUOTE = "'\\''"

/** Renders a command as a copy-pasteable shell line, single-quoting arguments that need it. */
export function formatCommand(command: CommandSpec): string {
  return [command.file, ...command.args]
    .map((arg) => (SAFE_ARG.test(arg) ? arg : `'${arg.replaceAll("'", ESCAPED_QUOTE)}'`))
    .join(' ')
}

/** Runs a command to completion with colours disabled; a spawn failure yields code 1 and its message. */
export function runCommand(command: CommandSpec): CommandOutput {
  const result = spawnSync(command.file, command.args, {
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 64 * 1024 * 1024,
  })
  // stdout and stderr are null at runtime when the program cannot be spawned.
  const parts: readonly (string | null | undefined)[] = [result.stdout, result.stderr, result.error?.message]
  return { code: result.status ?? 1, output: parts.filter((part) => typeof part === 'string').join('') }
}
