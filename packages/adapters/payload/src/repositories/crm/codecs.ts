import type { Id, Money } from '@ops/kernel'
import { fieldOf, idOf, msOf, numberOf, textOf, type Doc } from '../documents'

// Method signatures keep codecs of different value types assignable to one table type.
interface FieldCodec<V, F extends string> {
  readonly fields: readonly F[]
  decode(doc: Doc): V | undefined
  encode(value: V): Readonly<Record<string, unknown>>
}

/** Codecs for every property of `D`, stored in document fields named in `F`; `decode` returns `undefined` for a missing required value. */
export type Codecs<D, F extends string = string> = { readonly [K in keyof D]-?: FieldCodec<D[K], F> }

type AnyCodecs = Readonly<Record<string, FieldCodec<unknown, string>>>

// A relationship read with depth above 0 holds the populated document instead of its id.
function relationId(value: unknown): Id | undefined {
  return typeof value === 'object' && value !== null ? idOf(fieldOf(value, 'id')) : idOf(value)
}

function single<V, F extends string>(field: F, read: (doc: Doc, key: F) => V | undefined): FieldCodec<V, F> {
  return { fields: [field], decode: (doc) => read(doc, field), encode: (value) => ({ [field]: value }) }
}

/** Required text; a missing value reads as empty. */
export const text = <F extends string>(field: F) => single(field, (doc, key) => textOf(doc, key) ?? '')

/** Optional text. */
export const optionalText = <F extends string>(field: F) => single(field, (doc, key) => textOf(doc, key) ?? null)

/** Optional number such as an epoch ms date. */
export const optionalNumber = <F extends string>(field: F) => single(field, numberOf)

/** Required id held by a relationship or text field; a document without it is incomplete. */
export const requiredRef = <F extends string>(field: F) => single(field, (doc, key) => relationId(fieldOf(doc, key)))

/** Optional relationship id. */
export const optionalRef = <F extends string>(field: F) =>
  single(field, (doc, key) => relationId(fieldOf(doc, key)) ?? null)

/** Has-many relationship ids. */
export const refList = <F extends string>(field: F) =>
  single<readonly Id[], F>(field, (doc, key) => {
    const value = fieldOf(doc, key)
    return Array.isArray(value) ? value.flatMap((item) => relationId(item) ?? []) : []
  })

/** Stage entry time; a record without one has been in its stage since it was created. */
export const stageEntry = <F extends string>(field: F) =>
  single(field, (doc, key) => numberOf(doc, key) ?? msOf(fieldOf(doc, 'createdAt')))

/** Money stored as integer minor units plus an ISO 4217 code (D-10); `null` unless both are set. */
export function money<A extends string, C extends string>(amount: A, currency: C): FieldCodec<Money | null, A | C> {
  return {
    fields: [amount, currency],
    decode: (doc) => {
      const amountMinor = numberOf(doc, amount)
      const code = textOf(doc, currency) ?? ''
      return amountMinor === null || code === '' ? null : { amountMinor, currency: code }
    },
    encode: (value) => ({ [amount]: value?.amountMinor ?? null, [currency]: value?.currency ?? null }),
  }
}

/** Decodes every property of `D`; `undefined` when a required value is missing. */
export function decodeFields<D extends object>(codecs: Codecs<D>, doc: Doc): D | undefined {
  const entries = Object.entries(codecs as AnyCodecs).map(([key, codec]) => [key, codec.decode(doc)] as const)
  return entries.some(([, value]) => value === undefined) ? undefined : (Object.fromEntries(entries) as D)
}

/** Document fields for the properties set in `values`. */
export function encodeFields<D extends object>(codecs: Codecs<D>, values: Partial<D>): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const [key, codec] of Object.entries(codecs as AnyCodecs)) {
    const value = fieldOf(values, key)
    if (value !== undefined) Object.assign(data, codec.encode(value))
  }
  return data
}
