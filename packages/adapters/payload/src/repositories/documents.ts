import { asId, type Id } from '@ops/kernel'

/** A Payload document read with `depth: 0`, so relationships hold ids; generated types may narrow it, so fields are read by key. */
export type Doc = object

/** The raw value of field `key`. */
export function fieldOf(doc: Doc, key: string): unknown {
  const value: unknown = Reflect.get(doc, key)
  return value
}

/** The string at `key`, or `undefined`. */
export function textOf(doc: Doc, key: string): string | undefined {
  const value = fieldOf(doc, key)
  return typeof value === 'string' ? value : undefined
}

/** The finite number at `key`, or `null`. */
export function numberOf(doc: Doc, key: string): number | null {
  const value = fieldOf(doc, key)
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** An unpopulated relationship value as an id string. */
export function idOf(value: unknown): Id | undefined {
  return typeof value === 'string' || typeof value === 'number' ? asId(String(value)) : undefined
}

/** A has-many relationship value as id strings. */
export function idsOf(value: unknown): Id[] {
  return Array.isArray(value) ? value.flatMap((item) => idOf(item) ?? []) : []
}

/** Epoch ms of a Payload ISO timestamp such as `updatedAt`. */
export function msOf(value: unknown): number | undefined {
  const ms = typeof value === 'string' ? Date.parse(value) : Number.NaN
  return Number.isNaN(ms) ? undefined : ms
}

/** `value` when it is one of `values`. */
export function oneOf<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return values.find((candidate) => candidate === value)
}
