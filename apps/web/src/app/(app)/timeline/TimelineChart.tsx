'use client'

import { ToggleGroup, ToggleGroupItem } from '@ops/ui/components/ui/toggle-group'
import { GanttView, type GanttBar, type GanttViewLabels, type GanttZoom } from '@ops/ui/composites/GanttView'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createDatesSaver, type TimelineTask } from './save-dates'

const LABELS: GanttViewLabels = { title: 'Title', start: 'Start', due: 'Due', saveFailed: 'Could not save the dates' }
const ZOOMS: readonly { value: GanttZoom; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]

function isZoom(value: unknown): value is GanttZoom {
  return value === 'week' || value === 'month'
}

/** Timeline chart with a zoom toggle; persists bar changes through `setTaskDates`. */
export function TimelineChart({ title, tasks }: Readonly<{ title: string; tasks: readonly TimelineTask[] }>) {
  const router = useRouter()
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
      {ZOOMS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} count={tasks.length} actions={zoomToggle} />
      <GanttView bars={bars} zoom={zoom} onDatesChange={onDatesChange} labels={LABELS} />
    </div>
  )
}
