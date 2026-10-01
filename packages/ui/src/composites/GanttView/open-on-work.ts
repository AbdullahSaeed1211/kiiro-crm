import type { IApi, ITask } from '@svar-ui/react-gantt'
import { openingOffset } from './model'

interface ChartScale {
  readonly start?: Date
  readonly lengthUnitWidth?: number
}

interface Watchable {
  subscribe(listener: (value: ChartScale | undefined) => void): () => void
}

/**
 * The library starts its chart at an early day of its own choosing, so a timeline of this month's work opens on empty
 * weeks. Once the chart knows its scale, this scrolls it to a few days before the first task, one time.
 */
export function openOnWork(api: IApi, tasks: () => readonly ITask[]): void {
  const scales = (api.getReactiveState() as unknown as Record<string, Watchable | undefined>)['_scales']
  if (scales === undefined) return
  let opened = false
  const subscription: { stop?: () => void } = {}
  subscription.stop = scales.subscribe((scale) => {
    if (opened || scale?.start === undefined || scale.lengthUnitWidth === undefined) return
    opened = true
    const left = openingOffset(tasks(), { start: scale.start, dayWidth: scale.lengthUnitWidth })
    if (left > 0) void api.exec('scroll-chart', { left })
    queueMicrotask(() => {
      subscription.stop?.()
    })
  })
}
