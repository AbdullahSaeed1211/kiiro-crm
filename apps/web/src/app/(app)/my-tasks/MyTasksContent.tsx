import type { MyTaskBuckets } from '@ops/module-work'
import { StagePill } from '@ops/ui/composites/StagePill'
import { toStageColor } from '@ops/ui/composites/StagePill/stage'
import { CircleAlert, Minus, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { Locale } from '../../../i18n/config'
import { formatDate } from '../../../i18n/format'
import type { MyTaskModel } from '../../../server/queries/work/read-models'
import { taskHref } from '../task-navigation'
import { TaskCompleteButton } from './TaskCompleteButton'

const SECTIONS = [
  ['overdue', 'Overdue'],
  ['today', 'Today'],
  ['next7Days', 'Next 7 days'],
  ['later', 'Later'],
  ['noDueDate', 'No due date'],
] as const

const PRIORITY_ICON: Record<string, LucideIcon> = {
  none: Minus,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: CircleAlert,
}

function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}

function PriorityCell({ priority, locale }: Readonly<{ priority: string; locale: Locale }>) {
  const Icon = PRIORITY_ICON[priority] ?? Minus
  const labels: Record<Locale, Record<string, string>> = {
    en: {
      none: 'No priority',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    },
    es: {
      none: 'Sin prioridad',
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente',
    },
  }
  const label = labels[locale][priority] ?? priority
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

function DueCell({ dueAt, locale }: Readonly<{ dueAt: number | null; locale: Locale }>) {
  if (dueAt === null) return <EmptyValue />
  return (
    <time dateTime={new Date(dueAt).toISOString()} className="tabular-nums">
      {formatDate(dueAt, locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
    </time>
  )
}

export function MyTasksContent({
  buckets,
  model,
}: Readonly<{
  buckets: MyTaskBuckets
  model: MyTaskModel
}>) {
  return (
    <div className="space-y-4">
      {SECTIONS.map(([key, label]) => {
        const rows = buckets[key]
        return (
          <section className="ops-dashboard-card" key={key}>
            <header className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-medium">{label}</h2>
              <span className="text-sm text-muted-foreground">{rows.length}</span>
            </header>
            {rows.length === 0 ? (
              <div className="px-4 py-5 text-sm text-muted-foreground">Nothing here.</div>
            ) : (
              <ul className="divide-y">
                {rows.map((task) => {
                  const stageInfo = model.stages.find((s) => s.id === task.stageId)
                  const stageColor = toStageColor(stageInfo?.color ?? 'gray')
                  return (
                    <li className="px-4 py-3" key={task.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <Link
                            className="font-medium hover:text-primary hover:underline block"
                            href={taskHref(task.id, '/my-tasks')}
                            data-task-link-id={task.id}
                          >
                            {task.title}
                          </Link>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
                            {stageInfo && <StagePill name={stageInfo.name} color={stageColor} size="sm" />}
                            <PriorityCell priority={task.priority} locale={model.locale} />
                            <DueCell dueAt={task.dueAt} locale={model.locale} />
                          </div>
                        </div>
                        <TaskCompleteButton taskId={task.id} updatedAt={task.updatedAt} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
