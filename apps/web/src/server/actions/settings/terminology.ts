import { LEGACY_TERMINOLOGY_KEYS, MAX_TERM_LENGTH, TERMINOLOGY_KEYS } from '../../../i18n/terminology-keys'
import { stringValue } from './input'

const OWN_KEYS: ReadonlySet<string> = new Set([...TERMINOLOGY_KEYS, ...Object.values(LEGACY_TERMINOLOGY_KEYS)])

/**
 * The terminology to store after a save: the submitted names for the renamable terms, with everything else kept as it
 * was (onboarding progress, group names). An empty name clears its term so the default shows; the singular keys an
 * older form saved are dropped. Returns an error message when a name is too long.
 */
export function mergeTerminology(
  current: Readonly<Record<string, unknown>>,
  submitted: Readonly<Record<string, unknown>>,
): { readonly value: Record<string, unknown> } | { readonly error: string } {
  const names = TERMINOLOGY_KEYS.map((key) => [key, stringValue(submitted[key])] as const)
  if (names.some(([, name]) => name !== undefined && name.length > MAX_TERM_LENGTH)) {
    return { error: `Keep each name under ${String(MAX_TERM_LENGTH)} characters.` }
  }
  const kept = Object.entries(current).filter(([key]) => !OWN_KEYS.has(key))
  const set = names.flatMap(([key, name]) => (name === undefined ? [] : [[key, name] as const]))
  return { value: Object.fromEntries([...kept, ...set]) }
}
