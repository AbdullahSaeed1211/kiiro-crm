import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_PARENTS = ['apps', 'packages', 'packages/modules', 'packages/adapters']

const subdirs = (root: string, parent: string): string[] =>
  existsSync(join(root, parent))
    ? readdirSync(join(root, parent), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => `${parent}/${entry.name}`)
    : []

/** Returns the parent directories of the `dir/*` package globs listed in `pnpm-workspace.yaml` text. */
export function workspaceParents(yaml: string): string[] {
  const items = yaml
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
  const globs = items.map((item) => item.slice(2).replaceAll("'", '').replaceAll('"', '').trim())
  return globs.filter((glob) => glob.endsWith('/*')).map((glob) => glob.slice(0, -2))
}

/**
 * Lists workspace package directories (those holding a `package.json`) below `root`, sorted.
 * Uses `pnpm-workspace.yaml` when present, otherwise the default `apps/*` and `packages/**` layout.
 */
export function workspacePackages(root: string): string[] {
  const file = join(root, 'pnpm-workspace.yaml')
  const parents = existsSync(file) ? workspaceParents(readFileSync(file, 'utf8')) : DEFAULT_PARENTS
  const dirs = parents.flatMap((parent) => subdirs(root, parent)).sort((a, b) => a.localeCompare(b))
  return dirs.filter((dir) => existsSync(join(root, dir, 'package.json')))
}
