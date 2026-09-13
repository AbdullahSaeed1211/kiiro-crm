import { LOCAL, type Doc, type SeedPayload } from './payload'

export type Data = Record<string, unknown>
export type Tally = Map<string, { created: number; existing: number }>

export interface UpsertSpec {
  readonly collection: string
  readonly where: Data
  readonly data: () => Data
}

export const equals = (value: string): Data => ({ equals: value })

function count(tally: Tally, name: string, existed: boolean): void {
  const { created, existing } = tally.get(name) ?? { created: 0, existing: 0 }
  tally.set(name, existed ? { created, existing: existing + 1 } : { created: created + 1, existing })
}

export async function upsert(payload: SeedPayload, spec: UpsertSpec, tally: Tally): Promise<Doc> {
  const { docs } = await payload.find({ ...LOCAL, collection: spec.collection, where: spec.where, limit: 1 })
  const found = docs[0]
  count(tally, spec.collection, found !== undefined)
  return found ?? payload.create({ ...LOCAL, collection: spec.collection, data: spec.data() })
}
