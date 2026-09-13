import config from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

// Batch -1 is the row Payload's development schema push writes, not an applied migration.
async function latestMigration(): Promise<string | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'payload-migrations',
    where: { batch: { not_equals: -1 } },
    sort: ['-batch', '-name'],
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs.at(0)?.name ?? null
}

/** Health check (spec §12): application version and latest applied migration, or 503 when the database fails. */
export async function GET(): Promise<Response> {
  try {
    const migration = await latestMigration()
    return Response.json({ status: 'ok', version: process.env.APP_VERSION ?? 'dev', migration })
  } catch (error) {
    console.error('health: database unavailable', error)
    return Response.json({ status: 'unavailable' }, { status: 503 })
  }
}
