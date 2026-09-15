import { existsSync, readFileSync } from 'node:fs'

interface Claim {
  readonly status: string
  readonly requiredPaths: readonly string[]
}

const claim = JSON.parse(readFileSync('claim.json', 'utf8')) as Claim
const missing = claim.requiredPaths.filter((path) => !existsSync(path))
if (claim.status === 'DONE' && missing.length > 0) {
  console.error(`DONE report is missing required outputs: ${missing.join(', ')}`)
  process.exitCode = 1
} else console.log(`completion evidence covers ${String(claim.requiredPaths.length)} required outputs`)
