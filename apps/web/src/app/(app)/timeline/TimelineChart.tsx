'use client'

import { ToggleGroup, ToggleGroupItem } from '@ops/ui/components/ui/toggle-group'
import { GanttView, type GanttBar, type GanttViewLabels, type GanttZoom } from '@ops/ui/composites/GanttView'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TASK_COPY, type Locale } from '../../../i18n/config'
import { TaskWorkspaceViews } from '../tasks/TaskWorkspaceViews'
import { createDatesSaver, type TimelineTask } from './save-dates'

function labelsFor(locale: Locale): GanttViewLabels {
  const copy = TASK_COPY[locale]
  return { title: copy.title, start: copy.start, due: copy.due, saveFailed: copy.saveFailed }
}

function isZoom(value: unknown): value is GanttZoom {
  return value === 'week' || value === 'month'
}

/** Timeline chart with a zoom toggle; persists bar changes through `setTaskDates`. */
export function TimelineChart({
  title,
  tasks,
  locale,
}: Readonly<{ title: string; tasks: readonly TimelineTask[]; locale: Locale }>) {
  const router = useRouter()
  const copy = TASK_COPY[locale]
  const zooms: readonly { value: GanttZoom; label: string }[] = [
    { value: 'week', label: copy.week },
    { value: 'month', label: copy.month },
  ]
  const [zoom, setZoom] = useState<GanttZoom>('week')
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
  const zoomToggle = (
    <ToggleGroup
      size="sm"
      variant="outline"
      spacing={0}
      value={[zoom]}
      onValueChange={(values: unknown[]) => {
        if (isZoom(values[0])) setZoom(values[0])
      }}
    >
      {zooms.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        count={tasks.length}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <TaskWorkspaceViews active="gantt" />
            {zoomToggle}
          </div>
        }
      />
      <GanttView bars={bars} zoom={zoom} onDatesChange={onDatesChange} labels={labelsFor(locale)} locale={locale} />
    </div>
  )
}
