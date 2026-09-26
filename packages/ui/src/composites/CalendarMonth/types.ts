import type { ReactNode } from 'react'
import type { StageColor } from '../StagePill/stage'

/** One entry on the month calendar. */
export interface CalendarEvent {
  readonly id: string
  readonly title: string
  readonly date: string
  readonly href?: string
  /** Tint of the event chip; omitted means neutral. */
  readonly color?: StageColor
  readonly meta?: ReactNode
}
