import type { IApi, ITask } from '@svar-ui/react-gantt'
import { openingOffset } from './model'

interface ChartScale {
  readonly start?: Date
  readonly lengthUnitWidth?: number
}

interface Watchable {
  subscribe(listener: (value: ChartScale | undefined) => void): () => void
}

/** The chart's scale settles in more than one step, so it is re-aimed a few times while it opens. */
const AIM_DELAYS_MS = [0, 150, 400, 900, 1600]

function aim(api: IApi, scale: ChartScale | undefined, tasks: readonly ITask[]): void {
  if (scale?.start === undefined || scale.lengthUnitWidth === undefined) return
  const left = openingOffset(tasks, { start: scale.start, dayWidth: scale.lengthUnitWidth, now: Date.now() })
  if (left > 0) void api.exec('scroll-chart', { left })
}

/**
 * The library starts its chart at an early day of its own choosing, so a timeline of this month's work can open on empty
 * weeks (or on an old open task). This scrolls it to today, or to the work when today is outside it, as soon as the scale is known, and again a few times
 * while the chart finishes opening, then leaves the position to the person.
 */
export function openOnWork(api: IApi, tasks: () => readonly ITask[]): void {
  const scales = (api.getReactiveState() as unknown as Record<string, Watchable | undefined>)['_scales']
  if (scales === undefined) return
  let latest: ChartScale | undefined
  const stop = scales.subscribe((scale) => {
    latest = scale
  })
  for (const delay of AIM_DELAYS_MS) {
    window.setTimeout(() => {
      aim(api, latest, tasks())
    }, delay)
  }
  window.setTimeout(
    () => {
      stop()
    },
    AIM_DELAYS_MS.at(-1) ?? 0,
  )
}
