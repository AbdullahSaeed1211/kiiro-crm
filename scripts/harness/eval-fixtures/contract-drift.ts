import { strict as assert } from 'node:assert'

const mode = process.argv[2]
const DATA = 'directory/data.ts'
const HELPERS = 'directory/helpers.ts'
const UTILS = 'directory/utils.ts'
const TYPES = 'directory/types.ts'
const graph =
  mode === 'bad'
    ? new Map([
        [DATA, [HELPERS]],
        [HELPERS, [DATA]],
      ])
    : new Map([
        [DATA, [HELPERS, UTILS]],
        [HELPERS, [TYPES]],
        [UTILS, [TYPES]],
        [TYPES, []],
      ])

function hasCycle(node: string, visiting = new Set<string>(), visited = new Set<string>()): boolean {
  if (visiting.has(node)) return true
  if (visited.has(node)) return false
  visiting.add(node)
  for (const dependency of graph.get(node) ?? []) if (hasCycle(dependency, visiting, visited)) return true
  visiting.delete(node)
  visited.add(node)
  return false
}

const cyclic = [...graph.keys()].some((node) => hasCycle(node))
assert.equal(cyclic, mode === 'bad')
if (cyclic) {
  console.error('directory dependency cycle detected')
  process.exitCode = 1
} else console.log('CRM dependency graph is acyclic')
