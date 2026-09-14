import { readFileSync } from 'node:fs'

interface Gate {
  name: string
  exitCode: number
}
const gates = JSON.parse(readFileSync('gates.json', 'utf8')) as Gate[]
const failures = gates.filter((gate) => gate.exitCode !== 0)
if (failures.length > 0) {
  console.error(`completion blocked by ${failures.map((gate) => gate.name).join(', ')}`)
  process.exitCode = 1
} else console.log(`all ${String(gates.length)} configured gates are green`)
