import { readFileSync } from 'node:fs'

const claim = JSON.parse(readFileSync('claim.json', 'utf8'))
const failed = claim.gates.filter((gate) => gate.exitCode !== 0).map((gate) => gate.name)
const recorded = new Set(claim.recordedFailuresBeforeRemediation)
const missing = failed.filter((name) => !recorded.has(name))

if (missing.length > 0) {
  console.error(`aggregate gate failures were not recorded: ${missing.join(', ')}`)
  process.exitCode = 1
} else console.log(`aggregate gate record covers ${failed.length} failures before remediation`)
