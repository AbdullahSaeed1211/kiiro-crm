import { isMain } from './lib/report'
import { demoTarget } from './lib/demo-target'
import { localPayloadSecret, WEB_DIR } from './seed/local-env'
import { purgeDemo } from './seed/demo'
import { loadPayload } from './seed/payload'

async function main(): Promise<void> {
  const target = demoTarget(process.argv.slice(2), process.env)
  process.env['PAYLOAD_SECRET'] = localPayloadSecret(WEB_DIR)
  process.chdir(WEB_DIR)
  const payload = await loadPayload()
  const removed = await purgeDemo(payload)
  const summary = Object.entries(removed)
    .map(([name, count]) => `${name} ${String(count)}`)
    .join(', ')
  console.log(`seed:purge (${target.label}) removed ${summary === '' ? 'nothing (no demo data recorded)' : summary}`)
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
