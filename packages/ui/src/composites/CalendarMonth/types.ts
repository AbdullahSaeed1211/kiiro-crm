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
  /** Opaque text handed back to `onMove` when the event is dropped on another day. */
  readonly moveToken?: string
}

/** Moves an event to `date`; resolves to an error message, or nothing when it worked. */
export type CalendarMove = (move: {
  readonly id: string
  readonly token: string
  readonly from: string
  readonly to: string
}) => Promise<string | undefined>
