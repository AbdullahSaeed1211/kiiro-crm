/** Toggles one stage while preserving the stage order supplied by the caller. */
export function toggleStage(selected: readonly string[], stageId: string): string[] {
  return selected.includes(stageId) ? selected.filter((id) => id !== stageId) : [...selected, stageId]
}

/** Drops duplicate and empty ids from URL-derived stage state. */
export function normalizeStages(selected: readonly string[]): string[] {
  return [...new Set(selected.filter((id) => id.length > 0))]
}

/** Whether a list filter has anything to clear. */
export function hasActiveFilters(query: string, stages: readonly string[]): boolean {
  return query.trim().length > 0 || stages.length > 0
}
