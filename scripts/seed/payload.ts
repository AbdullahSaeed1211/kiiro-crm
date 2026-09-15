import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { WEB_DIR } from './local-env'

type Data = Record<string, unknown>

/** A stored document; the seed reads only its id and a few known fields. */
export type Doc = Readonly<Data> & { readonly id: string }

interface Access {
  readonly overrideAccess: true
  readonly depth: 0
  readonly context: { readonly authOperation: 'provisioning' }
}

/** The part of the Payload Local API the seed uses. */
export interface SeedPayload {
  find(args: Access & { collection: string; where: Data; limit: number }): Promise<{ docs: Doc[] }>
  create(args: Access & { collection: string; data: Data }): Promise<Doc>
  update(args: Access & { collection: string; id: string; data: Data }): Promise<Doc>
  findGlobal(args: Access & { slug: string }): Promise<Data>
  updateGlobal(args: Access & { slug: string; data: Data }): Promise<Data>
  destroy(): Promise<void>
}

interface PayloadModule {
  getPayload(options: { config: unknown }): Promise<SeedPayload>
}

/** Options every seed call passes: no access checks and no populated relationships. */
export const LOCAL: Access = { overrideAccess: true, depth: 0, context: { authOperation: 'provisioning' } }

/** Starts Payload with the web app's config; the working directory must be the web app so Wrangler finds its config. */
export async function loadPayload(): Promise<SeedPayload> {
  const resolveFromWeb = createRequire(join(WEB_DIR, 'package.json')).resolve
  const payload = (await import(pathToFileURL(resolveFromWeb('payload')).href)) as PayloadModule
  const config = (await import(pathToFileURL(join(WEB_DIR, 'src/payload.config.ts')).href)) as { default: unknown }
  return payload.getPayload({ config: config.default })
}
