import { isMain } from './lib/report'
import { assertLocalOnly, localPayloadSecret, WEB_DIR } from './seed/local-env'
import { loadPayload } from './seed/payload'
import { seedAll, summaryLine } from './seed/steps'

async function main(): Promise<void> {
  assertLocalOnly(process.env)
  process.env['PAYLOAD_SECRET'] = localPayloadSecret(WEB_DIR)
  process.chdir(WEB_DIR)
  const payload = await loadPayload()
  const tally = await seedAll(payload, Date.now())
  console.log(summaryLine(tally))
  await payload.destroy()
}

// Exits explicitly: the local Wrangler proxy keeps the event loop alive.
if (isMain(import.meta.url)) {
  main().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(error)
      process.exit(1)
    },
  )
}
