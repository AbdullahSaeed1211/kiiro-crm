import type { ReactNode } from 'react'

/** Stage category; mirrors the platform workflow contract (spec §9.4). */
export type KanbanStageCategory =
  'backlog' | 'open' | 'active' | 'waiting' | 'done_success' | 'done_failure' | 'cancelled'

/** Stage color token suffix of `bg-stage-*`. */
export type KanbanStageColor = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'pink'

/** A board column; the board renders stages in the given order. */
export interface KanbanStage {
  readonly id: string
  readonly name: string
  readonly category: KanbanStageCategory
  readonly color: KanbanStageColor
}

/** A board card; `meta` holds pre-rendered fields such as priority and due date. */
export interface KanbanCard {
  readonly id: string
  readonly stageId: string
  readonly title: string
  readonly updatedAt: number
  readonly href?: string
  readonly meta?: ReactNode
}

/** A stage change requested by a drop or the "Move to…" menu. */
export interface KanbanMove {
  readonly cardId: string
  readonly toStageId: string
  readonly expectedUpdatedAt: number
}

/** Result of `onMove`, matching the shape of server actions. */
export type KanbanMoveResult =
  | { readonly ok: true; readonly data: { readonly stageId: string; readonly updatedAt: number } }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

/** Translated strings of the board; `{name}` is replaced by the stage name. */
export interface KanbanBoardLabels {
  readonly expand: string
  readonly collapse: string
  readonly moveTo: string
  readonly moveFailed: string
  readonly conflict: string
}
