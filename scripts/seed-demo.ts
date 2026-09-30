import { isMain } from './lib/report'
import { assertLocalOnly, localPayloadSecret, WEB_DIR } from './seed/local-env'
import { seedDemo } from './seed/demo'
import { loadPayload } from './seed/payload'

async function main(): Promise<void> {
  assertLocalOnly(process.env)
  process.env['PAYLOAD_SECRET'] = localPayloadSecret(WEB_DIR)
  process.chdir(WEB_DIR)
  const payload = await loadPayload()
  const counts = await seedDemo(payload, Date.now())
  console.log(
    `seed:demo created ${Object.entries(counts)
      .map(([name, count]) => `${name} ${String(count)}`)
      .join(', ')}`,
  )
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
