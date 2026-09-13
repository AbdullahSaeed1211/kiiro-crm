import type { CommandRunner } from './exec.ts'

const SAFE_REF = /^[\w./@{}^~-]+$/

/** Rejects refs that would need shell quoting. */
export function assertSafeRef(ref: string): string {
  if (!SAFE_REF.test(ref)) throw new Error(`unsafe git ref "${ref}"`)
  return ref
}

function outputLines(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/** First local branch named `m<N>-*` (the milestone branch), if any. */
export async function detectMilestoneBranch(opts: {
  root: string
  number: number
  run: CommandRunner
}): Promise<string | undefined> {
  const command = `git branch --list 'm${String(opts.number)}-*' --format='%(refname:short)'`
  const result = await opts.run({ command, cwd: opts.root })
  return result.exitCode === 0 ? outputLines(result.output)[0] : undefined
}

/** Files changed since the merge base with `base`, including uncommitted and untracked files. */
export async function changedFiles(opts: {
  root: string
  base: string
  run: CommandRunner
}): Promise<string[] | undefined> {
  const cwd = opts.root
  const mergeBase = await opts.run({ command: `git merge-base ${assertSafeRef(opts.base)} HEAD`, cwd })
  const sha = outputLines(mergeBase.output)[0]
  if (mergeBase.exitCode !== 0 || sha === undefined) return undefined
  const diff = await opts.run({ command: `git diff --name-only ${assertSafeRef(sha)}`, cwd })
  const untracked = await opts.run({ command: 'git ls-files --others --exclude-standard', cwd })
  if (diff.exitCode !== 0 || untracked.exitCode !== 0) return undefined
  const files = new Set([...outputLines(diff.output), ...outputLines(untracked.output)])
  return [...files].sort((a, b) => a.localeCompare(b))
}
