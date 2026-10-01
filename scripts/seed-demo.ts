import { isMain } from './lib/report'
import { demoTarget } from './lib/demo-target'
import { localPayloadSecret, WEB_DIR } from './seed/local-env'
import { seedDemo } from './seed/demo'
import { loadPayload } from './seed/payload'

async function main(): Promise<void> {
  const target = demoTarget(process.argv.slice(2), process.env)
  process.env['PAYLOAD_SECRET'] = localPayloadSecret(WEB_DIR)
  process.chdir(WEB_DIR)
  const payload = await loadPayload()
  const counts = await seedDemo(payload, Date.now(), { workspace: target.workspace })
  console.log(
    `seed:demo (${target.label}) created ${Object.entries(counts)
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
