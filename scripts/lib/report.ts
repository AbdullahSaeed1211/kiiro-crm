import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Prints each finding to stderr plus a summary line, and sets the exit code: 1 when there are findings, else 0. */
export function report(name: string, findings: readonly string[]): void {
  for (const finding of findings) console.error(finding)
  console.log(findings.length === 0 ? `${name}: ok` : `${name}: ${String(findings.length)} finding(s)`)
  process.exitCode = findings.length === 0 ? 0 : 1
}

/** Runs an async CLI entry and maps its result (or a thrown error) to the process exit code. */
export function runCli(main: (argv: string[]) => Promise<number>): void {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 2
    },
  )
}

/** True when the module whose `import.meta.url` is `metaUrl` is the script the process was started with. */
export function isMain(metaUrl: string): boolean {
  const entry = process.argv[1]
  if (entry === undefined) return false
  try {
    return pathToFileURL(realpathSync(entry)).href === metaUrl
  } catch {
    return false
  }
}
