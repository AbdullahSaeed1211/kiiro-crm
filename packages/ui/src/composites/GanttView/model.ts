import type { IColumnConfig, IScaleConfig, ITask, TID } from '@svar-ui/react-gantt'

const DAY_MS = 24 * 60 * 60 * 1000
const HALF_DAY_HOURS = 12
const TODAY_CLASS = 'ops-gantt-today'

/** A task bar; times are epoch ms and at least one of them is set. */
export interface GanttBar {
  readonly id: string
  readonly title: string
  readonly start: number | null
  readonly end: number | null
}

/** Timeline zoom level. */
export type GanttZoom = 'week' | 'month'

/** Outcome of persisting new dates; a failure rolls the bar back and shows `error.message`. */
export type GanttDatesResult =
  { readonly ok: true } | { readonly ok: false; readonly error: { readonly message: string } }

/** Persists a bar's new whole-day dates in epoch ms. */
export type GanttDatesChange = (taskId: string, startAt: number, dueAt: number) => Promise<GanttDatesResult>

/** A bar's resolved start and end in epoch ms. */
export interface BarSpan {
  readonly start: number
  readonly end: number
}

/** Visible strings of the grid columns. */
export interface GanttColumnLabels {
  readonly title: string
  readonly start: string
  readonly due: string
}

/** Resolves a bar's span: start defaults to end − 1 day (spec §17.9), end to start + 1 day; spans under a day grow to one. */
export function barSpan(bar: Pick<GanttBar, 'start' | 'end'>): BarSpan | undefined {
  const { start, end } = bar
  if (start === null) return end === null ? undefined : { start: end - DAY_MS, end }
  if (end === null || end - start < DAY_MS) return { start, end: start + DAY_MS }
  return { start, end }
}

/** Maps epoch ms to a local midnight on the same UTC calendar day, the unit the library snaps to. */
export function toLibraryDate(epochMs: number): Date {
  const utc = new Date(epochMs)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

/** Maps a library date back to epoch ms, rounded to the nearest whole day. */
export function toEpochDay(date: Date): number {
  const nearest = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() + HALF_DAY_HOURS)
  return Date.UTC(nearest.getFullYear(), nearest.getMonth(), nearest.getDate())
}

/** Library tasks for the bars that have a date. */
export function toLibraryTasks(bars: readonly GanttBar[]): ITask[] {
  return bars.flatMap((bar) => {
    const span = barSpan(bar)
    if (span === undefined) return []
    const dates = { start: toLibraryDate(span.start), end: toLibraryDate(span.end) }
    return [{ id: bar.id, text: bar.title, type: 'task', progress: 0, ...dates }]
  })
}

/** Resolved spans by bar id; the last server-confirmed dates a failed change rolls back to. */
export function spanMap(bars: readonly GanttBar[]): Map<string, BarSpan> {
  const spans = new Map<string, BarSpan>()
  for (const bar of bars) {
    const span = barSpan(bar)
    if (span !== undefined) spans.set(bar.id, span)
  }
  return spans
}

/** Content key of the bars, so an unchanged server re-render does not reset the chart. */
export function barsSignature(bars: readonly GanttBar[]): string {
  return JSON.stringify(bars.map((bar) => [bar.id, bar.title, bar.start, bar.end]))
}

/** True for the library `update-task` that ends a drag or resize; progress edits and rollbacks carry no `diff`. */
export function isDateCommit(event: { readonly diff?: number; readonly inProgress?: boolean }): boolean {
  return typeof event.diff === 'number' && event.diff !== 0 && event.inProgress !== true
}

/** Whole-day epoch ms dates of a library task after a drag or resize. */
export function committedDates(task: Pick<ITask, 'start' | 'end'>): { startAt: number; dueAt: number } | undefined {
  if (task.start === undefined || task.end === undefined) return undefined
  return { startAt: toEpochDay(task.start), dueAt: toEpochDay(task.end) }
}

/** `update-task` payload restoring a bar to its confirmed span. */
export function rollbackUpdate(id: TID, span: BarSpan): { id: TID; task: Pick<ITask, 'start' | 'end'> } {
  return { id, task: { start: toLibraryDate(span.start), end: toLibraryDate(span.end) } }
}

/** Header rows and cell width for a zoom level; bars always move in whole days. */
export function scaleSetup(zoom: GanttZoom, locale?: string): { cellWidth: number; scales: IScaleConfig[] } {
  const month = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  const monthRow: IScaleConfig = { unit: 'month', step: 1, format: (date: Date) => month.format(date) }
  if (zoom === 'month') {
    const week = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
    return { cellWidth: 84, scales: [monthRow, { unit: 'week', step: 1, format: (date: Date) => week.format(date) }] }
  }
  const day = new Intl.DateTimeFormat(locale, { weekday: 'narrow', day: 'numeric' })
  return { cellWidth: 44, scales: [monthRow, { unit: 'day', step: 1, format: (date: Date) => day.format(date) }] }
}

/** Class for today's day cell, empty for other cells. */
export function todayClass(date: Date, unit: string, now: Date): string {
  return unit === 'day' && date.toDateString() === now.toDateString() ? TODAY_CLASS : ''
}

/** Read-only grid columns: title, start and due. */
export function ganttColumns(labels: GanttColumnLabels, locale?: string): IColumnConfig[] {
  const format = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })
  const template = (value: unknown) => (value instanceof Date ? format.format(value) : '')
  return [
    { id: 'text', header: labels.title, flexgrow: 1 },
    { id: 'start', header: labels.start, width: 88, align: 'center', template },
    { id: 'end', header: labels.due, width: 88, align: 'center', template },
  ]
}
