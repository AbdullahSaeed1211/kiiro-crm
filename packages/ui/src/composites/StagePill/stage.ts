import { isTerminalStage } from '../KanbanBoard/board-state'
import { STAGE_DOT } from '../KanbanBoard/stage-dot'
import type { KanbanStage, KanbanStageColor } from '../KanbanBoard/types'

/** A workflow stage as shown by pills, selects and filters (spec §9.4). */
export type StageOption = KanbanStage

/** Stage color token suffix of `bg-stage-*`. */
export type StageColor = KanbanStageColor

/** Open and terminal stages of a workflow, each group in the given order. */
export interface StageGroups {
  readonly open: readonly StageOption[]
  readonly terminal: readonly StageOption[]
}

/** Solid dot class of a stage color. */
export function stageDotClass(color: StageColor): string {
  return STAGE_DOT[color]
}

/** Subtle stage tint used by pills without making color the only stage signal. */
export function stagePillClass(color: StageColor): string {
  return `${STAGE_DOT[color]}/15`
}

/** Splits stages into open and terminal groups, keeping the given order inside each group. */
export function groupStages(stages: readonly StageOption[]): StageGroups {
  return { open: stages.filter((stage) => !isTerminalStage(stage)), terminal: stages.filter(isTerminalStage) }
}

/** Stages with the terminal ones moved last; the relative order inside each group is kept. */
export function orderStages(stages: readonly StageOption[]): StageOption[] {
  const { open, terminal } = groupStages(stages)
  return [...open, ...terminal]
}
