'use client'

import { ToggleGroup, ToggleGroupItem } from '@ops/ui/components/ui/toggle-group'
import { GanttView, type GanttBar, type GanttViewLabels, type GanttZoom } from '@ops/ui/composites/GanttView'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { TASK_COPY, type Locale } from '../../../i18n/config'
import { TaskWorkspaceViews } from '../tasks/TaskWorkspaceViews'
import { createDatesSaver, type TimelineTask } from './save-dates'

function labelsFor(locale: Locale): GanttViewLabels {
  const copy = TASK_COPY[locale]
  return {
    title: copy.title,
    start: copy.start,
    due: copy.due,
    timelineChart: copy.timelineChart,
    saveFailed: copy.saveFailed,
  }
}

function isZoom(value: unknown): value is GanttZoom {
  return value === 'week' || value === 'month'
}

function isDisplayMode(value: unknown): value is 'grid' | 'chart' {
  return value === 'grid' || value === 'chart'
}

const COMPACT_QUERY = '(max-width: 650px)'

function subscribeCompact(onChange: () => void) {
  const query = window.matchMedia(COMPACT_QUERY)
  query.addEventListener('change', onChange)
  return () => {
    query.removeEventListener('change', onChange)
  }
}

const compactMatches = () => window.matchMedia(COMPACT_QUERY).matches
const desktopDefault = () => false

function ZoomToggle({
  value,
  options,
  onChange,
}: Readonly<{
  value: GanttZoom
  options: readonly { value: GanttZoom; label: string }[]
  onChange: (value: unknown) => void
}>) {
  return (
    <ToggleGroup
      size="sm"
      variant="outline"
      spacing={0}
      value={[value]}
      onValueChange={(values: unknown[]) => {
        onChange(values[0])
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function CompactViewToggle({
  value,
  gridLabel,
  chartLabel,
  onChange,
}: Readonly<{
  value: 'grid' | 'chart'
  gridLabel: string
  chartLabel: string
  onChange: (value: unknown) => void
}>) {
  return (
    <ToggleGroup
      size="sm"
      variant="outline"
      spacing={0}
      value={[value]}
      onValueChange={(values: unknown[]) => {
        onChange(values[0])
      }}
    >
      <ToggleGroupItem value="grid">{gridLabel}</ToggleGroupItem>
      <ToggleGroupItem value="chart">{chartLabel}</ToggleGroupItem>
    </ToggleGroup>
  )
}

/** Timeline chart with a zoom toggle; persists bar changes through `setTaskDates`. */
export function TimelineChart({
  title,
  tasks,
  locale,
}: Readonly<{ title: string; tasks: readonly TimelineTask[]; locale: Locale }>) {
  const router = useRouter()
  const copy = TASK_COPY[locale]
  const compact = useSyncExternalStore(subscribeCompact, compactMatches, desktopDefault)
  const zooms: readonly { value: GanttZoom; label: string }[] = [
    { value: 'week', label: copy.week },
    { value: 'month', label: copy.month },
  ]
  const [zoom, setZoom] = useState<GanttZoom>('week')
  const [displayMode, setDisplayMode] = useState<'grid' | 'chart'>('chart')
  const latestTasks = useRef(tasks)
  const savedVersions = useRef(new Map<string, number>())
  useEffect(() => {
    latestTasks.current = tasks
  }, [tasks])
  const bars = useMemo<GanttBar[]>(
    () => tasks.map(({ id, title: text, startAt, dueAt }) => ({ id, title: text, start: startAt, end: dueAt })),
    [tasks],
  )
  const onDatesChange = useMemo(
    () =>
      createDatesSaver({
        // The newer of the rendered version and the last save; the server re-render may lag behind a save.
        versionOf: (taskId) =>
          Math.max(
            latestTasks.current.find((task) => task.id === taskId)?.updatedAt ?? 0,
            savedVersions.current.get(taskId) ?? 0,
          ),
        onSaved: (taskId, updatedAt) => {
          savedVersions.current.set(taskId, updatedAt)
        },
        onConflict: () => {
          router.refresh()
        },
      }),
    [router],
  )
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        count={tasks.length}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TaskWorkspaceViews active="gantt" />
            {compact ? (
              <CompactViewToggle
                value={displayMode}
                gridLabel={copy.timelineGridView}
                chartLabel={copy.timelineChartView}
                onChange={(value) => {
                  if (isDisplayMode(value)) setDisplayMode(value)
                }}
              />
            ) : null}
            <ZoomToggle
              value={zoom}
              options={zooms}
              onChange={(value) => {
                if (isZoom(value)) setZoom(value)
              }}
            />
          </div>
        }
      />
      <GanttView
        bars={bars}
        zoom={zoom}
        compact={compact}
        displayMode={displayMode}
        onDatesChange={onDatesChange}
        labels={labelsFor(locale)}
        locale={locale}
      />
    </div>
  )
}
