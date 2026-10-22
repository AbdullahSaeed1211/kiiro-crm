import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { OrganizationRelations, RelatedTask } from '../../server/crm/directory/data'
import type { OrganizationReadiness } from '../../server/crm/directory/organization-readiness'
import type { PersonSummary } from '../../server/crm/directory/data'
import { formatDate } from '../../i18n/format'
import type { RecordCopy } from '../../i18n/record-copy'
import type { OrganizationOverviewCopy } from '../../i18n/organization-overview-copy'
import { RelationList, RelationRow } from './record-view-primitives'
import { taskHref } from './task-navigation'

function RelatedCreateAction({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      href={href}
      className="-mr-2 inline-flex min-h-8 items-center rounded-sm px-2 text-sm font-medium ops-brand-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </Link>
  )
}

function contactTitle(contact: { firstName: string; lastName: string | null }): string {
  return contact.lastName === null ? contact.firstName : `${contact.firstName} ${contact.lastName}`
}

type RelationSection = Readonly<{
  label: string
  count: number
  empty: string
  action: ReactNode | null
  items: readonly ReactNode[]
}>

function RelationSectionCard({ section }: Readonly<{ section: RelationSection }>) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle>
          {section.label} <span className="font-normal text-muted-foreground tabular-nums">{section.count}</span>
        </CardTitle>
        {section.action === null ? null : <CardAction>{section.action}</CardAction>}
      </CardHeader>
      <CardContent>
        <RelationList bare items={section.items} empty={section.empty} />
      </CardContent>
    </Card>
  )
}

function NextDueTaskCard({
  task,
  copy,
  locale,
  organizationId,
}: Readonly<{
  task: RelatedTask
  copy: OrganizationOverviewCopy
  locale: string
  organizationId: string
}>) {
  if (task.dueAt === null) return null
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle>{copy.nextDueItem}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={taskHref(task.id, `/organizations/${organizationId}`)}
          data-task-link-id={task.id}
          className="min-w-0 truncate font-medium hover:underline"
        >
          {task.title}
        </Link>
        <time
          dateTime={new Date(task.dueAt).toISOString()}
          className="shrink-0 text-sm tabular-nums text-muted-foreground"
        >
          {formatDate(task.dueAt, locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
        </time>
      </CardContent>
    </Card>
  )
}

function OrganizationSummary({
  organizationId,
  nextDueTask,
  owner,
  readiness,
  overviewCopy,
  locale,
}: Readonly<{
  organizationId: string
  nextDueTask: RelatedTask | null
  owner: PersonSummary | null
  readiness: OrganizationReadiness
  overviewCopy: OrganizationOverviewCopy
  locale: string
}>) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {nextDueTask === null ? (
        <Card size="sm" className="min-w-0">
          <CardHeader>
            <CardTitle>{overviewCopy.nextDueItem}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{overviewCopy.noDueItems}</CardContent>
        </Card>
      ) : (
        <NextDueTaskCard task={nextDueTask} copy={overviewCopy} locale={locale} organizationId={organizationId} />
      )}
      <Card size="sm" className="min-w-0">
        <CardHeader>
          <CardTitle>{overviewCopy.responsiblePerson}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">{owner?.name ?? overviewCopy.noResponsiblePerson}</CardContent>
      </Card>
      <Card size="sm" className="min-w-0">
        <CardHeader>
          <CardTitle>{overviewCopy.overdueWork}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{readiness.overdueTaskCount}</span>
          <span className="text-sm text-muted-foreground">
            {readiness.overdueTaskCount === 0 ? overviewCopy.noOverdueWork : overviewCopy.taskUnit}
          </span>
        </CardContent>
      </Card>
      <Card size="sm" className="min-w-0">
        <CardHeader>
          <CardTitle>{overviewCopy.awaitingClientResponse}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{readiness.pendingApprovalCount}</span>
          <span className="text-sm text-muted-foreground">
            {readiness.pendingApprovalCount === 0 ? overviewCopy.noPendingResponses : overviewCopy.deliverableUnit}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}

export function OrganizationOverview({
  organizationId,
  relations,
  nextDueTask,
  owner,
  readiness,
  copy,
  overviewCopy,
  locale,
}: Readonly<{
  organizationId: string
  relations: OrganizationRelations
  nextDueTask: RelatedTask | null
  owner: PersonSummary | null
  readiness: OrganizationReadiness
  copy: RecordCopy
  overviewCopy: OrganizationOverviewCopy
  locale: string
}>) {
  const sections = [
    {
      label: copy.projects,
      count: relations.projects.length,
      empty: copy.noProjectsLinked,
      action: (
        <RelatedCreateAction
          href={`/projects/new?organizationId=${encodeURIComponent(organizationId)}`}
          label={copy.addProject}
        />
      ),
      items: relations.projects.map((project) => (
        <RelationRow key={project.id} href={`/projects/${project.id}`} title={project.name} />
      )),
    },
    {
      label: copy.contacts,
      count: relations.contacts.length,
      empty: copy.noContactsLinked,
      action: (
        <RelatedCreateAction
          href={`/contacts/new?organizationId=${encodeURIComponent(organizationId)}`}
          label={copy.addContact}
        />
      ),
      items: relations.contacts.map((contact) => (
        <RelationRow
          key={contact.id}
          href={`/contacts/${contact.id}`}
          title={contactTitle(contact)}
          detail={contact.email ?? undefined}
        />
      )),
    },
    {
      label: copy.deals,
      count: relations.deals.length,
      empty: copy.noDealsLinked,
      action: null,
      items: relations.deals.map((deal) => <RelationRow key={deal.id} href={`/deals/${deal.id}`} title={deal.title} />),
    },
  ] as const
  return (
    <div className="grid gap-4">
      <OrganizationSummary
        organizationId={organizationId}
        nextDueTask={nextDueTask}
        owner={owner}
        readiness={readiness}
        overviewCopy={overviewCopy}
        locale={locale}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <RelationSectionCard key={section.label} section={section} />
        ))}
      </div>
    </div>
  )
}
