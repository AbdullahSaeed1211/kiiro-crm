import type { KanbanStageColor } from './types'

/** Solid stage color classes from the `--stage-*` tokens (spec §15.2). */
export const STAGE_DOT: Readonly<Record<KanbanStageColor, string>> = {
  gray: 'bg-stage-gray',
  blue: 'bg-stage-blue',
  green: 'bg-stage-green',
  amber: 'bg-stage-amber',
  red: 'bg-stage-red',
  violet: 'bg-stage-violet',
  teal: 'bg-stage-teal',
  pink: 'bg-stage-pink',
}

/** Subtle stage tint classes, spelled out so Tailwind generates every one. */
export const STAGE_PILL: Readonly<Record<KanbanStageColor, string>> = {
  gray: 'bg-stage-gray/15',
  blue: 'bg-stage-blue/15',
  green: 'bg-stage-green/15',
  amber: 'bg-stage-amber/15',
  red: 'bg-stage-red/15',
  violet: 'bg-stage-violet/15',
  teal: 'bg-stage-teal/15',
  pink: 'bg-stage-pink/15',
}
