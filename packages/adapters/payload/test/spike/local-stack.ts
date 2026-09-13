import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  createLocalReq,
  getPayload,
  type Migration,
  type Payload,
  type PayloadRequest,
  type SanitizedConfig,
} from 'payload'
import { assertLocalOnly, localPayloadSecret, WEB_DIR } from '../../../../../scripts/seed/local-env'
import type { SeedPayload } from '../../../../../scripts/seed/payload'
import { seedAll } from '../../../../../scripts/seed/steps'
import { COLLECTIONS } from '../../src/contracts/names'

// Wrangler keeps local state next to the config it finds from the working directory, so a config copy here gives the
// tests their own D1 file: `pnpm test` never resets the development database or contends with a running `pnpm dev`.
const STACK_DIR = join(WEB_DIR, '.wrangler', 'spike-test')

/** A named check the test file registers with `it`. */
export type SpikeCase = readonly [title: string, run: (stack: LocalStack) => Promise<void>]

/** Emails of the users `scripts/seed/data.ts` creates. */
export const SEEDED_EMAILS = {
  owner: 'owner@example.test',
  manager: 'manager@example.test',
  staff1: 'staff1@example.test',
  staff2: 'staff2@example.test',
} as const

/** Payload on the web app's config over a freshly migrated and seeded local D1 database. */
export interface LocalStack {
  readonly payload: Payload
  /** Seed clock; seeded due dates are offsets from it. */
  readonly now: number
  dispose(): Promise<void>
}

function prepareStackDir(): void {
  rmSync(STACK_DIR, { recursive: true, force: true })
  mkdirSync(STACK_DIR, { recursive: true })
  copyFileSync(join(WEB_DIR, 'wrangler.jsonc'), join(STACK_DIR, 'wrangler.jsonc'))
  const devVars = ['.dev.vars', '.dev.vars.example'].map((name) => join(WEB_DIR, name)).find((path) => existsSync(path))
  if (devVars !== undefined) copyFileSync(devVars, join(STACK_DIR, '.dev.vars'))
}

async function importFromWeb<T>(relativePath: string): Promise<T> {
  return (await import(pathToFileURL(join(WEB_DIR, relativePath)).href)) as T
}

/** Starts the stack; the working directory changes until `dispose`. */
export async function startLocalStack(): Promise<LocalStack> {
  assertLocalOnly(process.env)
  const previousDir = process.cwd()
  process.env['PAYLOAD_SECRET'] = localPayloadSecret(WEB_DIR)
  prepareStackDir()
  process.chdir(STACK_DIR)
  const config = await importFromWeb<{ default: Promise<SanitizedConfig> }>('src/payload.config.ts')
  const { migrations } = await importFromWeb<{ migrations: Migration[] }>('src/migrations/index.ts')
  const payload = await getPayload({ config: config.default })
  await payload.db.migrate({ migrations })
  const now = Date.now()
  // The seed types only the subset of the Local API it calls.
  await seedAll(payload as unknown as SeedPayload, now)
  const dispose = async (): Promise<void> => {
    await payload.destroy()
    process.chdir(previousDir)
  }
  return { payload, now, dispose }
}

/** A users document found by email with system access. */
export async function userByEmail(payload: Payload, email: string): Promise<object & { readonly id: string | number }> {
  const where = { email: { equals: email } }
  const { docs } = await payload.find({
    collection: COLLECTIONS.users,
    where,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const [user] = docs
  if (user === undefined) throw new Error(`no user ${email}`)
  return user
}

/** A Local API request authenticated as the user with `email`, as `getWorkDeps` builds it from a session. */
export async function requestAs(payload: Payload, email: string): Promise<PayloadRequest> {
  const user = await userByEmail(payload, email)
  return createLocalReq({ user: { ...user, collection: COLLECTIONS.users } }, payload)
}
