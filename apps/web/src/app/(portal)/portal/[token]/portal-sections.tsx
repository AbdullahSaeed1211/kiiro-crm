import { isExpired, isOverdue, type BillingDocument, type PortalProject } from '@ops/module-billing'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { BillingCopy } from '../../../../i18n/billing-copy'
import { fill } from '../../../../i18n/locale'
import type { PortalClientCopy } from '../../../../i18n/portal-copy'
import { formatMoney } from '../../../(app)/billing/money'
import { StatusChip } from '../../../(app)/billing/status-chip'

export interface SectionContext {
  readonly token: string
  readonly copy: PortalClientCopy
  readonly billing: BillingCopy
  /** A BCP 47 tag such as en-US, for dates and money. */
  readonly locale: string
  readonly now: number
}

export const formatDate = (locale: string, time: number): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

/** The state the client sees: overdue and expired come from the dates, as on the staff pages. */
export function shownState(document: BillingDocument, now: number): string {
  if (isOverdue(document, now)) return 'overdue'
  return isExpired(document, now) ? 'expired' : document.status
}

/** A quote that is still open for an answer. */
export const awaitsAnswer = (document: BillingDocument, now: number): boolean =>
  document.kind === 'quote' && document.status === 'sent' && !isExpired(document, now)

/** "Valid until: date" or "Due: date", or nothing for a document without a date. */
export function dueLabel(document: BillingDocument, where: Readonly<{ billing: BillingCopy; locale: string }>): string {
  if (document.dueAt === null) return ''
  const label = document.kind === 'quote' ? where.billing.dueQuote : where.billing.dueInvoice
  return `${label}: ${formatDate(where.locale, document.dueAt)}`
}

export function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function DocumentRow({ document, context }: Readonly<{ document: BillingDocument; context: SectionContext }>) {
  const { billing, locale, now, token, copy } = context
  const state = shownState(document, now)
  return (
    <li>
      <Link
        href={`/portal/${token}/${document.id}`}
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      >
        <span className="grid min-w-0 gap-0.5">
          <span className="font-medium">{document.number}</span>
          <span className="text-xs text-muted-foreground">{dueLabel(document, context)}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="font-medium tabular-nums">
            {formatMoney({ minor: document.totalMinor, currency: document.currency, locale })}
          </span>
          <StatusChip status={state} label={billing.states[state] ?? state} />
          <span className="sr-only">{copy.view}</span>
        </span>
      </Link>
    </li>
  )
}

export function DocumentList({
  documents,
  context,
}: Readonly<{ documents: readonly BillingDocument[]; context: SectionContext }>) {
  if (documents.length === 0) return <p className="text-sm text-muted-foreground">{context.copy.nothing}</p>
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-background text-sm">
      {documents.map((document) => (
        <DocumentRow key={document.id} document={document} context={context} />
      ))}
    </ul>
  )
}

function ProjectCard({ project, context }: Readonly<{ project: PortalProject; context: SectionContext }>) {
  const total = project.openTasks + project.doneTasks
  const percent = total === 0 ? 0 : Math.round((project.doneTasks / total) * 100)
  return (
    <li className="grid gap-2 rounded-xl border bg-background p-4">
      <span className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{project.name}</span>
        {project.stage === '' ? null : <span className="text-xs text-muted-foreground">{project.stage}</span>}
      </span>
      <span
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={project.name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className="block h-full rounded-full bg-primary" style={{ width: `${String(percent)}%` }} />
      </span>
      <span className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>{fill(context.copy.tasksDone, { done: project.doneTasks, total })}</span>
        {project.dueAt === null ? null : (
          <span>{fill(context.copy.targetDate, { date: formatDate(context.locale, project.dueAt) })}</span>
        )}
      </span>
    </li>
  )
}

export function ProjectList({
  projects,
  context,
}: Readonly<{ projects: readonly PortalProject[]; context: SectionContext }>) {
  if (projects.length === 0) return <p className="text-sm text-muted-foreground">{context.copy.nothing}</p>
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} context={context} />
      ))}
    </ul>
  )
}

/** The neutral page for a wrong, expired or revoked link. */
export function InvalidLink({ copy }: Readonly<{ copy: PortalClientCopy }>) {
  return (
    <div className="mx-auto grid max-w-md gap-2 rounded-xl border bg-background p-6 text-center">
      <h1 className="text-lg font-semibold">{copy.invalidTitle}</h1>
      <p className="text-sm text-muted-foreground">{copy.invalidHelp}</p>
    </div>
  )
}
