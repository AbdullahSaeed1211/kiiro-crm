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
