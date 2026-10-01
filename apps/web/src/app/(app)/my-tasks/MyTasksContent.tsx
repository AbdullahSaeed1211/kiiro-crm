import { EmptyValue } from '@ops/ui/composites/DataTable'
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

type Task = MyTaskBuckets['overdue'][number]

function TaskRow({ task, model, overdue }: Readonly<{ task: Task; model: MyTaskModel; overdue: boolean }>) {
  const stageInfo = model.stages.find((s) => s.id === task.stageId)
  const project = task.projectId === null ? undefined : model.projectNames[task.projectId]
  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            className="block font-medium hover:text-primary hover:underline"
            href={taskHref(task.id, '/my-tasks')}
            data-task-link-id={task.id}
          >
            {task.title}
          </Link>
          {project === undefined ? null : <p className="truncate text-xs text-muted-foreground">{project}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
            {stageInfo && <StagePill name={stageInfo.name} color={toStageColor(stageInfo.color)} size="sm" />}
            <PriorityCell priority={task.priority} locale={model.locale} />
            <span className={overdue ? 'text-destructive' : undefined}>
              <DueCell dueAt={task.dueAt} locale={model.locale} />
            </span>
          </div>
        </div>
        <TaskCompleteButton taskId={task.id} updatedAt={task.updatedAt} />
      </div>
    </li>
  )
}

/** The signed-in person's open tasks in due-date groups; a group with nothing in it is left out. */
export function MyTasksContent({
  buckets,
  model,
}: Readonly<{
  buckets: MyTaskBuckets
  model: MyTaskModel
}>) {
  return (
    <div className="space-y-4">
      {SECTIONS.filter(([key]) => buckets[key].length > 0).map(([key, label]) => (
        <section className="ops-dashboard-card" key={key}>
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className={key === 'overdue' ? 'font-medium text-destructive' : 'font-medium'}>{label}</h2>
            <span className="text-sm text-muted-foreground">{buckets[key].length}</span>
          </header>
          <ul className="divide-y">
            {buckets[key].map((task) => (
              <TaskRow key={task.id} task={task} model={model} overdue={key === 'overdue'} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
