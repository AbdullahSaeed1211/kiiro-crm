'use client'

import '@svar-ui/react-gantt/all.css'
import './gantt-theme.css'
import { Gantt, Willow, type IApi, type TID } from '@svar-ui/react-gantt'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import {
  barsSignature,
  committedDates,
  ganttColumns,
  isDateCommit,
  rollbackUpdate,
  scaleSetup,
  spanMap,
  GANTT_TASK_TYPES,
  todayClass,
  toLibraryTasks,
  type BarSpan,
  type GanttBar,
  type GanttColumnLabels,
  type GanttDatesChange,
  type GanttZoom,
} from './model'
import { openOnWork } from './open-on-work'
import { useGanttAccessibility } from './gantt-a11y'

/** Visible strings of {@link GanttView}. */
export interface GanttViewLabels extends GanttColumnLabels {
  /** Accessible name of the scrollable chart region. */
  readonly timelineChart: string
  /** Shown when the change callback throws instead of returning a result. */
  readonly saveFailed: string
}

/** Props of {@link GanttView}. */
export type GanttViewProps = Readonly<{
  bars: readonly GanttBar[]
  zoom: GanttZoom
  compact: boolean
  displayMode: 'grid' | 'chart'
  onDatesChange: GanttDatesChange
  labels: GanttViewLabels
  locale?: string
}>

interface CommitContext {
  readonly api: IApi
  readonly onDatesChange: RefObject<GanttDatesChange>
  readonly confirmed: RefObject<Map<string, BarSpan>>
  readonly labels: RefObject<GanttViewLabels>
  readonly setError: (message: string | undefined) => void
}

// Editing that this view cannot persist: task creation, deletion, reordering, links and the edit form.
const BLOCKED_ACTIONS = ['add-task', 'copy-task', 'delete-task', 'indent-task', 'move-task', 'add-link', 'show-editor']

const subscribeNever = () => () => undefined
const highlightTime = (date: Date, unit: string) => todayClass(date, unit, new Date())

function useOpenOnWorkCleanup(stop: RefObject<() => void>): void {
  useEffect(() => {
    return () => {
      stop.current()
    }
  }, [stop])
}

function useGanttRefs(input: { bars: readonly GanttBar[]; onDatesChange: GanttDatesChange; labels: GanttViewLabels }) {
  const { bars, onDatesChange, labels } = input
  const rootRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<IApi | null>(null)
  const stopOpenOnWork = useRef<() => void>(() => undefined)
  const onDatesChangeRef = useRef(onDatesChange)
  const labelsRef = useRef(labels)
  const confirmed = useRef(spanMap(bars))
  onDatesChangeRef.current = onDatesChange
  labelsRef.current = labels
  useEffect(() => {
    confirmed.current = spanMap(bars)
  }, [bars])
  useOpenOnWorkCleanup(stopOpenOnWork)
  return { rootRef, apiRef, stopOpenOnWork, onDatesChangeRef, labelsRef, confirmed }
}

async function commitDates(context: CommitContext, id: TID): Promise<void> {
  const dates = committedDates(context.api.getTask(id))
  if (dates === undefined) return
  const key = String(id)
  const failed = { ok: false, error: { message: context.labels.current.saveFailed } } as const
  const result = await context.onDatesChange.current(key, dates.startAt, dates.dueAt).catch(() => failed)
  if (result.ok) {
    context.confirmed.current.set(key, { start: dates.startAt, end: dates.dueAt })
    context.setError(undefined)
    return
  }
  const previous = context.confirmed.current.get(key)
  if (previous !== undefined) void context.api.exec('update-task', rollbackUpdate(id, previous))
  context.setError(result.error.message)
}

function guardEdits(api: IApi): void {
  for (const action of BLOCKED_ACTIONS) api.intercept(action, () => false)
  api.intercept('update-task', (event) => !('progress' in event.task))
  api.intercept('drag-task', (event) => typeof event.top !== 'number')
}

/** Timeline of task bars (SVAR Gantt, MIT edition); a drag or resize calls `onDatesChange` and rolls back on failure. */
export function GanttView({ bars, zoom, compact, displayMode, onDatesChange, labels, locale }: GanttViewProps) {
  // The library measures the DOM and uses the browser time zone, so it renders on the client only.
  const clientReady = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  const [error, setError] = useState<string>()
  const signature = barsSignature(bars)
  const { rootRef, apiRef, stopOpenOnWork, onDatesChangeRef, labelsRef, confirmed } = useGanttRefs({
    bars,
    onDatesChange,
    labels,
  })
  // Keyed by content: a new tasks array makes the library re-initialize its store.
  const tasks = useMemo(() => toLibraryTasks(bars), [signature])
  useEffect(() => {
    const api = apiRef.current
    if (api === null) return
    void api.exec('set-display-mode', { mode: compact ? displayMode : 'all' })
  }, [clientReady, compact, displayMode])
  const setup = useMemo(() => scaleSetup(zoom, locale), [locale, zoom])
  const columns = useMemo(() => ganttColumns(labels, locale), [labels, locale])
  useGanttAccessibility(rootRef, {
    tasks,
    chartLabel: labels.timelineChart,
    clientReady,
    chartOnly: compact && displayMode === 'chart',
  })
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const init = useCallback((api: IApi) => {
    apiRef.current = api
    stopOpenOnWork.current()
    stopOpenOnWork.current = openOnWork(api, () => tasksRef.current, rootRef.current)
    const context = { api, onDatesChange: onDatesChangeRef, confirmed, labels: labelsRef, setError }
    guardEdits(api)
    api.on('update-task', (event) => {
      if (isDateCommit(event)) void commitDates(context, event.id)
    })
  }, [])
  return (
    <div ref={rootRef} className="ops-gantt flex min-h-0 flex-col gap-2">
      {error === undefined ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="h-[calc(100svh-11rem)] min-h-80 overflow-hidden rounded-md border">
        {clientReady ? (
          <Willow fonts={false}>
            <Gantt
              tasks={tasks}
              taskTypes={GANTT_TASK_TYPES}
              scales={setup.scales}
              cellWidth={setup.cellWidth}
              lengthUnit="day"
              durationUnit="day"
              displayMode={compact ? displayMode : 'all'}
              columns={columns}
              highlightTime={highlightTime}
              init={init}
            />
          </Willow>
        ) : null}
      </div>
    </div>
  )
}
