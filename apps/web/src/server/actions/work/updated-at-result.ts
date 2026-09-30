import type { Result } from '@ops/kernel'

/** The shape work actions return to the client: the record's new version, or the use case's error. */
export function updatedAtResult(result: Result<{ readonly updatedAt: number }>) {
  return result.ok
    ? { ok: true as const, data: { updatedAt: result.value.updatedAt } }
    : { ok: false as const, error: result.error }
}
