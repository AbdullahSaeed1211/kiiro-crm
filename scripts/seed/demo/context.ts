import { COLLECTIONS } from '../../../packages/adapters/payload/src/contracts/names'
import { LOCAL, type Doc, type SeedPayload } from '../payload'
import type { DemoEntry } from '../../../packages/adapters/payload/src/demo-records'

const DAY_MS = 86_400_000

/** What the writers share: Payload, the seed clock, the keys they resolved, and the manifest being built. */
export interface WriteContext {
  readonly payload: SeedPayload
  readonly now: number
  /** Ids of documents by demo key, for example `org3` or `staff1`. */
  readonly ids: Map<string, string>
  readonly manifest: DemoEntry[]
  /** The owner user document, used as the author of system-side history. */
  readonly owner: Doc
  /** User documents by key, for writes that run as that user. */
  readonly users: Map<string, Doc>
  /** The password demo users are made with: the well-known local one, or a random one in a real workspace. */
  readonly password: string
}

export const at = (context: WriteContext, day: number): number => context.now + day * DAY_MS

export function idFor(context: WriteContext, key: string): string {
  const id = context.ids.get(key)
  if (id === undefined) throw new Error(`demo data refers to unknown "${key}"`)
  return id
}

/** Creates a document dated `day` days from the clock, and records it for the purge. */
export async function createDoc(
  context: WriteContext,
  input: {
    readonly collection: string
    readonly data: Record<string, unknown>
    readonly day?: number
    readonly key?: string
    readonly user?: Doc
  },
): Promise<string> {
  const stamp =
    input.day === undefined
      ? {}
      : {
          createdAt: new Date(at(context, input.day)).toISOString(),
          updatedAt: new Date(at(context, input.day)).toISOString(),
        }
  const doc = await context.payload.create({
    ...LOCAL,
    collection: input.collection,
    data: { ...input.data, ...stamp },
    ...(input.user === undefined ? {} : { user: input.user }),
  })
  context.manifest.push({ collection: input.collection, id: doc.id })
  if (input.key !== undefined) context.ids.set(input.key, doc.id)
  return doc.id
}

export { COLLECTIONS }
