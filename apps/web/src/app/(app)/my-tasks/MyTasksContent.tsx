import { missedPeriods, type MyTaskBuckets } from '@ops/module-work'
import { StagePill } from '@ops/ui/composites/StagePill'
import { toStageColor } from '@ops/ui/composites/StagePill/stage'
import Link from 'next/link'
import type { Locale } from '../../../i18n/config'
import { catalogFor } from '../../../i18n/locale'
import { MY_TASKS_COPY, type MyTasksCopy } from '../../../i18n/my-tasks-copy'
import { formatDate } from '../../../i18n/format'
import type { MyTaskModel } from '../../../server/queries/work/my-task-model'
import { taskHref } from '../task-navigation'
import { PriorityCell } from '../tasks/priority-cell'
import { TaskCompleteButton } from './TaskCompleteButton'

const SECTIONS = ['overdue', 'today', 'next7Days', 'later', 'noDueDate'] as const

function DueCell({ dueAt, locale }: Readonly<{ dueAt: number | null; locale: Locale }>) {
  if (dueAt === null) return null
  return (
    <time dateTime={new Date(dueAt).toISOString()} className="tabular-nums">
      {formatDate(dueAt, locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
    </time>
  )
}

type Task = MyTaskBuckets['overdue'][number]

/** An untaken team task: the title, its project and due date, with no complete button since it is not yours yet. */
function TeamTaskRow({ task, model }: Readonly<{ task: MyTaskModel['teamTasks'][number]; model: MyTaskModel }>) {
  const project = task.projectId === null ? undefined : model.projectNames[task.projectId]
  return (
    <li className="px-4 py-3">
      <Link
        className="block font-medium hover:text-primary hover:underline"
        href={taskHref(task.id, '/my-tasks')}
        data-task-link-id={task.id}
      >
        {task.title}
      </Link>
      {project === undefined ? null : <p className="truncate text-xs text-muted-foreground">{project}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
        <PriorityCell priority={task.priority} locale={model.locale} hideNone />
        <DueCell dueAt={task.dueAt} locale={model.locale} />
      </div>
    </li>
  )
}

/** "3 periods missed" beside the due date of a repeating task that was left for more than one period. */
function MissedPeriods({ task, copy }: Readonly<{ task: Task; copy: MyTasksCopy }>) {
  const count = task.dueAt === null ? 0 : missedPeriods(task.dueAt, task.repeat, Date.now())
  if (count < 2) return null
  return <span className="text-destructive">{copy.missedPeriods.replace('{count}', String(count))}</span>
}

function TaskRow({
  task,
  model,
  overdue,
  copy,
}: Readonly<{ task: Task; model: MyTaskModel; overdue: boolean; copy: MyTasksCopy }>) {
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
            <PriorityCell priority={task.priority} locale={model.locale} hideNone />
            <span className={overdue ? 'text-destructive' : undefined}>
              <DueCell dueAt={task.dueAt} locale={model.locale} />
            </span>
            <MissedPeriods task={task} copy={copy} />
          </div>
        </div>
        <TaskCompleteButton taskId={task.id} updatedAt={task.updatedAt} />
      </div>
    </li>
  )
}

/** Switches between the due-date groups and one group per client. */
function GroupToggle({ group, copy }: Readonly<{ group: 'date' | 'client'; copy: MyTasksCopy }>) {
  const link = (active: boolean) =>
    active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground hover:underline'
  return (
    <nav aria-label={copy.groupBy} className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{copy.groupBy}</span>
      <Link className={link(group === 'date')} href="/my-tasks">
        {copy.byDate}
      </Link>
      <Link className={link(group === 'client')} href="/my-tasks?group=client">
        {copy.byClient}
      </Link>
    </nav>
  )
}

/** One section per client (project), the soonest due first, so a client's whole backlog is read in one place. */
function ClientSections({
  buckets,
  model,
  copy,
}: Readonly<{ buckets: MyTaskBuckets; model: MyTaskModel; copy: MyTasksCopy }>) {
  const overdueIds = new Set(buckets.overdue.map((task) => task.id))
  const groups = new Map<string, Task[]>()
  for (const key of SECTIONS) {
    for (const task of buckets[key]) {
      const name = task.projectId === null ? copy.noProject : (model.projectNames[task.projectId] ?? copy.noProject)
      groups.set(name, [...(groups.get(name) ?? []), task])
    }
  }
  const names = [...groups.keys()].toSorted((a, b) => {
    if (a === copy.noProject || b === copy.noProject) return a === copy.noProject ? 1 : -1
    return a.localeCompare(b)
  })
  return names.map((name) => (
    <section className="ops-dashboard-card" key={name}>
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-medium">{name}</h2>
        <span className="text-sm text-muted-foreground">{groups.get(name)?.length ?? 0}</span>
      </header>
      <ul className="divide-y">
        {(groups.get(name) ?? []).map((task) => (
          <TaskRow key={task.id} task={task} model={model} overdue={overdueIds.has(task.id)} copy={copy} />
        ))}
      </ul>
    </section>
  ))
}

/** The signed-in person's open tasks in due-date groups, then their team's untaken tasks; empty groups are left out. */
export function MyTasksContent({
  buckets,
  model,
  group = 'date',
}: Readonly<{
  buckets: MyTaskBuckets
  model: MyTaskModel
  group?: 'date' | 'client'
}>) {
  const copy = catalogFor(MY_TASKS_COPY, model.locale)
  return (
    <div className="space-y-4">
      <GroupToggle group={group} copy={copy} />
      {group === 'client' ? <ClientSections buckets={buckets} model={model} copy={copy} /> : null}
      {SECTIONS.filter((key) => group === 'date' && buckets[key].length > 0).map((key) => (
        <section className="ops-dashboard-card" key={key}>
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className={key === 'overdue' ? 'font-medium text-destructive' : 'font-medium'}>{copy[key]}</h2>
            <span className="text-sm text-muted-foreground">{buckets[key].length}</span>
          </header>
          <ul className="divide-y">
            {buckets[key].map((task) => (
              <TaskRow key={task.id} task={task} model={model} overdue={key === 'overdue'} copy={copy} />
            ))}
          </ul>
        </section>
      ))}
      {model.teamTasks.length === 0 ? null : (
        <section className="ops-dashboard-card">
          <header className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{copy.team}</h2>
              <span className="text-sm text-muted-foreground">{model.teamTasks.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">{copy.teamHelp}</p>
          </header>
          <ul className="divide-y">
            {model.teamTasks.map((task) => (
              <TeamTaskRow key={task.id} task={task} model={model} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
