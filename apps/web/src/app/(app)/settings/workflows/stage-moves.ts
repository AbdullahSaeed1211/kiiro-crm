import { newStage, type Stage } from './workflow-model'

/** The stages with the one at `from` moved to sit at `to`; out-of-range moves change nothing. */
export function moveStage(stages: readonly Stage[], from: number, to: number): Stage[] {
  const moved = stages.at(from)
  if (from === to || moved === undefined || to < 0 || to >= stages.length) return [...stages]
  const next = stages.filter((_, index) => index !== from)
  next.splice(to, 0, moved)
  return next
}

/** The stages with a new empty one inserted before position `at`. */
export function insertStage(stages: readonly Stage[], at: number): Stage[] {
  const next = [...stages]
  next.splice(Math.min(Math.max(at, 0), next.length), 0, newStage())
  return next
}
