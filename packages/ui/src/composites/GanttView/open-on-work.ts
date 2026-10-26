import type { IApi, ITask } from '@svar-ui/react-gantt'
import { openingOffset } from './model'

interface ChartScale {
  readonly start?: Date
  readonly lengthUnitWidth?: number
}

interface Watchable {
  subscribe(listener: (value: ChartScale | undefined) => void): () => void
}

/** The chart's scale settles in more than one step, so it is re-aimed briefly while it opens. */
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
export function openOnWork(api: IApi, tasks: () => readonly ITask[], root: HTMLElement | null): () => void {
  const scales = (api.getReactiveState() as unknown as Record<string, Watchable | undefined>)['_scales']
  if (scales === undefined || root === null) return () => undefined
  let latest: ChartScale | undefined
  let stopped = false
  const timers: number[] = []
  const stop = () => {
    if (stopped) return
    stopped = true
    timers.forEach((timer) => {
      window.clearTimeout(timer)
    })
    root.removeEventListener('pointerdown', stop)
    root.removeEventListener('wheel', stop)
    root.removeEventListener('touchstart', stop)
    root.removeEventListener('keydown', stop)
    unsubscribe()
  }
  const unsubscribe = scales.subscribe((scale) => {
    latest = scale
  })
  root.addEventListener('pointerdown', stop, { once: true, passive: true })
  root.addEventListener('wheel', stop, { once: true, passive: true })
  root.addEventListener('touchstart', stop, { once: true, passive: true })
  root.addEventListener('keydown', stop, { once: true })
  for (const delay of AIM_DELAYS_MS) {
    timers.push(
      window.setTimeout(() => {
        if (!stopped) aim(api, latest, tasks())
      }, delay),
    )
  }
  timers.push(window.setTimeout(stop, AIM_DELAYS_MS.at(-1) ?? 0))
  return stop
}
