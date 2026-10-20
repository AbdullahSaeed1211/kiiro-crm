import { CircleAlert, Minus, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from 'lucide-react'
import { TASK_COPY, type Locale } from '../../../i18n/config'

const PRIORITY_ICON: Readonly<Record<string, LucideIcon>> = {
  none: Minus,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: CircleAlert,
}

/** The icon for a priority; the board draws its own smaller label with it. */
export function priorityIcon(priority: string): LucideIcon {
  return PRIORITY_ICON[priority] ?? Minus
}

/**
 * The priority icon and its name. A priority outside the known set shows as its raw value; `hideNone` shows nothing for
 * a task with no priority, for rows where an empty label only adds noise.
 */
export function PriorityCell({
  priority,
  locale,
  hideNone = false,
}: Readonly<{ priority: string; locale: Locale; hideNone?: boolean }>) {
  if (hideNone && priority === 'none') return null
  const Icon = priorityIcon(priority)
  const label = TASK_COPY[locale][priority === 'none' ? 'noPriority' : priority] ?? priority
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        aria-hidden
        className={priority === 'urgent' ? 'size-4 text-destructive' : 'size-4 text-muted-foreground'}
      />
      {label}
    </span>
  )
}
