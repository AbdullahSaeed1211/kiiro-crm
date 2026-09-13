import { spawn } from 'node:child_process'
import { delimiter, join } from 'node:path'

export interface CommandResult {
  exitCode: number
  output: string
  durationMs: number
}

export interface CommandRequest {
  command: string
  cwd: string
}

/** Runs a shell command; injected in tests so no real processes are needed. */
export type CommandRunner = (request: CommandRequest) => Promise<CommandResult>

/** Real runner: `sh -c <command>` with the root `node_modules/.bin` on PATH and colours disabled. */
export function createShellRunner(options: { root: string; echo?: boolean }): CommandRunner {
  const binDir = join(options.root, 'node_modules', '.bin')
  return (request) =>
    new Promise((resolvePromise) => {
      const started = Date.now()
      const env = { ...process.env, PATH: `${binDir}${delimiter}${process.env['PATH'] ?? ''}`, FORCE_COLOR: '0' }
      const child = spawn(request.command, { cwd: request.cwd, shell: true, env })
      const chunks: string[] = []
      const collect = (data: Buffer): void => {
        chunks.push(data.toString('utf8'))
        if (options.echo === true) process.stderr.write(data)
      }
      child.stdout.on('data', collect)
      child.stderr.on('data', collect)
      const finish = (exitCode: number): void => {
        resolvePromise({ exitCode, output: chunks.join(''), durationMs: Date.now() - started })
      }
      child.on('error', (error) => {
        chunks.push(error.message)
        finish(127)
      })
      child.on('close', (code) => {
        finish(code ?? 1)
      })
    })
}

/** ANSI escape sequences (ESC `[` params letter), built from a char code to keep control characters out of the source. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, 'g')

export function stripAnsi(text: string): string {
  return text.replace(ANSI, '')
}
