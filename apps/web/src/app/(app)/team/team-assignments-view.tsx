'use client'

import { DataTable, type DataTableColumn, type DataTableRow } from '@ops/ui/composites/DataTable'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { Badge } from '@ops/ui/components/ui/badge'
import { Users } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/i18n/format'
import { TEAM_ASSIGNMENTS_COPY } from '@/i18n/team-assignments-copy'
import { taskHref } from '../task-navigation'
import type {
  TeamAssignmentMember,
  TeamAssignmentProject,
  TeamAssignmentTask,
} from '@/server/queries/work/team-assignments'

type Locale = 'en' | 'es'

function dateLabel(value: number | null, locale: Locale): string {
  return value === null ? '—' : formatDate(value, locale, { dateStyle: 'medium', timeZone: 'UTC' })
}

function labelsFor(locale: Locale) {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  return {
    selectAll: copy.selectAll,
    selectRow: copy.selectRow,
    columns: copy.columns,
    previous: copy.previous,
    next: copy.next,
    range: copy.range,
    selected: copy.selected,
  }
}

function personColumns(locale: Locale): readonly DataTableColumn[] {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  return [
    { id: 'person', header: copy.people },
    { id: 'tasks', header: copy.openTasks, numeric: true },
    { id: 'projects', header: copy.projects, numeric: true },
    { id: 'nextDue', header: copy.nextDue },
  ]
}

function personRows(members: readonly TeamAssignmentMember[], locale: Locale): readonly DataTableRow[] {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  return members.map((member) => ({
    id: member.id,
    cells: {
      person: (
        <Link href={`/tasks?view=open&assignee=${encodeURIComponent(member.id)}`} className="font-medium">
          {member.name}
        </Link>
      ),
      tasks: String(member.openTaskCount),
      projects: String(member.openProjectCount),
      nextDue:
        member.nextDue === null ? (
          <Badge variant="outline">
            {member.openTaskCount + member.openProjectCount === 0 ? copy.noOpenAssignments : copy.noDatedWork}
          </Badge>
        ) : (
          <div className="grid gap-0.5">
            <Link
              href={
                member.nextDue.kind === 'task' ? taskHref(member.nextDue.id, '/team') : `/projects/${member.nextDue.id}`
              }
              className="truncate font-medium"
            >
              {member.nextDue.title}
            </Link>
            <span className="text-xs text-muted-foreground">{dateLabel(member.nextDue.dueAt, locale)}</span>
          </div>
        ),
    },
  }))
}

function taskColumns(locale: Locale): readonly DataTableColumn[] {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  return [
    { id: 'task', header: copy.task },
    { id: 'project', header: copy.project },
    { id: 'due', header: copy.due },
  ]
}

function taskRows(tasks: readonly TeamAssignmentTask[], locale: Locale): readonly DataTableRow[] {
  return tasks.map((task) => ({
    id: task.id,
    cells: {
      task: (
        <Link href={taskHref(task.id, '/team')} className="font-medium">
          {task.title}
        </Link>
      ),
      project:
        task.projectId === null || task.projectName === null ? (
          '—'
        ) : (
          <Link href={`/projects/${task.projectId}`}>{task.projectName}</Link>
        ),
      due: task.dueAt === null ? '—' : dateLabel(task.dueAt, locale),
    },
  }))
}

function ProjectList({ projects, locale }: Readonly<{ projects: readonly TeamAssignmentProject[]; locale: Locale }>) {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  if (projects.length === 0) return <p className="text-sm text-muted-foreground">{copy.noProjects}</p>
  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id} className="rounded-lg border bg-card p-3">
          <Link className="font-medium" href={`/projects/${project.id}`}>
            {project.name}
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.targetEnd}: {dateLabel(project.targetEndAt, locale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.members.replace('{count}', String(project.memberCount))}
          </p>
        </li>
      ))}
    </ul>
  )
}

type TeamViewProps = Readonly<{
  locale: Locale
  members: readonly TeamAssignmentMember[]
  unassignedTasks: readonly TeamAssignmentTask[]
  ownerGapProjects: readonly TeamAssignmentProject[]
}>

function SummaryCards({ members, unassignedTasks, ownerGapProjects, locale }: TeamViewProps) {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <section className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">{copy.people}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{members.length}</p>
      </section>
      <section className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">{copy.unassignedTasks}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{unassignedTasks.length}</p>
      </section>
      <section className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">{copy.ownerGaps}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{ownerGapProjects.length}</p>
      </section>
    </div>
  )
}

function PeopleSection({ locale, members }: Pick<TeamViewProps, 'locale' | 'members'>) {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  return (
    <section className="grid gap-3" aria-labelledby="team-assignments-heading">
      <div>
        <h2 id="team-assignments-heading" className="text-base font-semibold">
          {copy.people}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <DataTable
        columns={personColumns(locale)}
        rows={personRows(members, locale)}
        pagination={{ page: 1, pageSize: Math.max(members.length, 1), total: members.length }}
        labels={labelsFor(locale)}
        emptyState={<EmptyState icon={Users} title={copy.noPeople} />}
        mobileCard={{ cells: ['person', 'tasks', 'projects', 'nextDue'] }}
      />
    </section>
  )
}

function UnassignedTasksSection({ locale, unassignedTasks }: TeamViewProps) {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  return (
    <section className="grid gap-3" aria-labelledby="unassigned-work-heading">
      <div>
        <h2 id="unassigned-work-heading" className="text-base font-semibold">
          {copy.unassignedWork}{' '}
          <span className="text-sm font-normal text-muted-foreground">{unassignedTasks.length}</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.unassignedDescription}</p>
      </div>
      {unassignedTasks.length === 0 ? (
        <EmptyState title={copy.noUnassignedWork} />
      ) : (
        <DataTable
          columns={taskColumns(locale)}
          rows={taskRows(unassignedTasks, locale)}
          pagination={{ page: 1, pageSize: Math.max(unassignedTasks.length, 1), total: unassignedTasks.length }}
          labels={labelsFor(locale)}
          emptyState={<p className="text-sm text-muted-foreground">{copy.noTasks}</p>}
          mobileCard={{ cells: ['task', 'project', 'due'] }}
        />
      )}
    </section>
  )
}

function ProjectOwnerGapsSection({ locale, ownerGapProjects }: TeamViewProps) {
  const copy = TEAM_ASSIGNMENTS_COPY[locale]
  return (
    <section className="grid gap-3" aria-labelledby="project-owner-gaps-heading">
      <div>
        <h2 id="project-owner-gaps-heading" className="text-base font-semibold">
          {copy.ownerGaps} <span className="text-sm font-normal text-muted-foreground">{ownerGapProjects.length}</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.ownerGapDescription}</p>
      </div>
      <ProjectList projects={ownerGapProjects} locale={locale} />
    </section>
  )
}

export function TeamAssignmentsView(props: TeamViewProps) {
  return (
    <div className="grid gap-6">
      <SummaryCards {...props} />
      <PeopleSection locale={props.locale} members={props.members} />
      <UnassignedTasksSection {...props} />
      <ProjectOwnerGapsSection {...props} />
    </div>
  )
}
