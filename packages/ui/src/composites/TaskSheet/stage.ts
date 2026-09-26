/** Shared stage utilities. */

const TERMINAL_CATEGORIES: ReadonlySet<string> = new Set(['done_success', 'done_failure', 'cancelled'])

/** True for terminal stages (completed, failed, or cancelled). */
export function isTerminalStageCategory(stageCategory: string | undefined): boolean {
  return TERMINAL_CATEGORIES.has(stageCategory ?? '')
}
