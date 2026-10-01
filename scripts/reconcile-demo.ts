import { demoTarget } from './lib/demo-target'
import { isMain } from './lib/report'
import { reconcileDemo } from './seed/demo'
import { localPayloadSecret, WEB_DIR } from './seed/local-env'
import { loadPayload } from './seed/payload'

const HOUR_MS = 3_600_000

/**
 * Rebuilds the demo purge list from the data itself, for a run that was killed before it could save the list. It adds
 * what is missing and is safe to run again. Users and fields count only if made in the last few hours (`--hours N`,
 * default 3), so accounts and fields that were already there are never taken for the demo's.
 */
async function main(): Promise<void> {
  const target = demoTarget(process.argv.slice(2), process.env)
  process.env['PAYLOAD_SECRET'] = localPayloadSecret(WEB_DIR)
  process.chdir(WEB_DIR)
  const payload = await loadPayload()
  const at = process.argv.indexOf('--hours')
  const hours = at < 0 ? 3 : Number(process.argv[at + 1])
  if (!Number.isFinite(hours) || hours <= 0) throw new Error('--hours needs a positive number')
  const added = await reconcileDemo(payload, Date.now() - hours * HOUR_MS)
  console.log(`seed:reconcile (${target.label}) added ${String(added)} records to the purge list`)
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
