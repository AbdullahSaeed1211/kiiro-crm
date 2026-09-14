import { readFileSync } from 'node:fs'

interface Scope {
  allowed: string[]
  changed: string[]
}
const { allowed, changed } = JSON.parse(readFileSync('scope.json', 'utf8')) as Scope
const matches = (path: string, pattern: string): boolean =>
  pattern.endsWith('/**') ? path.startsWith(pattern.slice(0, -3)) : path === pattern
const violations = changed.filter((path) => !allowed.some((pattern) => matches(path, pattern)))
if (violations.length > 0) {
  console.error(`out-of-scope changed path: ${violations.join(', ')}`)
  process.exitCode = 1
} else console.log('all changed paths are within the declared work package scope')
