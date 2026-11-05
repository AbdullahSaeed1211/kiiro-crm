import type { AutomationCopy } from '../../../../i18n/automation-copy'
import { formatDate } from '../../../../i18n/format'
import type { Locale } from '../../../../i18n/locale'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { Workflow } from 'lucide-react'
import Link from 'next/link'

export interface StoredAction {
  readonly kind: string
  readonly ok: boolean
  readonly detail?: string
}

export interface RuleRunRow {
  readonly id: string
  readonly ruleName: string
  readonly recordType: string
  readonly recordId: string
  readonly status: 'running' | 'done' | 'failed'
  readonly startedAt: number
  readonly finishedAt: number | null
  readonly actions: readonly StoredAction[]
  readonly error: string | null
}

const RECORD_ROUTES: Readonly<Record<string, string | undefined>> = { lead: 'leads', deal: 'deals', task: 'tasks' }

const STATUS_TONE: Readonly<Record<RuleRunRow['status'], string>> = {
  running: 'text-muted-foreground',
  done: 'text-emerald-700 dark:text-emerald-400',
  failed: 'text-destructive',
}

function actionLabel(kind: string, copy: AutomationCopy): string {
  switch (kind) {
    case 'create_task':
      return copy.actions.create_task
    case 'assign_owner':
      return copy.actions.assign_owner
    case 'notify':
      return copy.actions.notify
    default:
      return copy.unknownAction
  }
}

function summary(run: RuleRunRow, copy: AutomationCopy): string {
  if (run.error !== null) return run.error
  if (run.actions.length === 0) return copy.noActions
  return run.actions
    .map((action) => {
      const failed = action.ok ? '' : ` — ${copy.failed}`
      const detail = action.detail === undefined ? '' : `: ${action.detail}`
      return `${actionLabel(action.kind, copy)}${failed}${detail}`
    })
    .join(' · ')
}

function RecordCell({ run, copy }: Readonly<{ run: RuleRunRow; copy: AutomationCopy }>) {
  const route = RECORD_ROUTES[run.recordType]
  const label = copy.recordTypes[run.recordType] ?? run.recordType
  return route === undefined ? (
    <span>{label}</span>
  ) : (
    <Link className="underline" href={`/${route}/${encodeURIComponent(run.recordId)}`}>
      {label}
    </Link>
  )
}

function RunRow({ run, locale, copy }: Readonly<{ run: RuleRunRow; locale: Locale; copy: AutomationCopy }>) {
  return (
    <tr>
      <td className="whitespace-nowrap p-3">
        {formatDate(run.startedAt, locale, { dateStyle: 'short', timeStyle: 'short' })}
      </td>
      <td className="p-3">{run.ruleName}</td>
      <td className="p-3">
        <RecordCell run={run} copy={copy} />
      </td>
      <td className={`p-3 font-medium ${STATUS_TONE[run.status]}`}>{copy.statuses[run.status]}</td>
      <td className="p-3">{summary(run, copy)}</td>
    </tr>
  )
}

/** The latest rule runs: when, which rule, which record, the outcome and what each action did. */
export function RunHistory({
  runs,
  locale,
  copy,
}: Readonly<{ runs: readonly RuleRunRow[]; locale: Locale; copy: AutomationCopy }>) {
  if (runs.length === 0) return <EmptyState icon={Workflow} title={copy.emptyHistory} description={copy.historyHelp} />
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium">{copy.historyTitle}</h2>
        <p className="text-sm text-muted-foreground">{copy.historyHelp}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">{copy.time}</th>
              <th className="p-3 font-medium">{copy.rule}</th>
              <th className="p-3 font-medium">{copy.record}</th>
              <th className="p-3 font-medium">{copy.status}</th>
              <th className="p-3 font-medium">{copy.result}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} locale={locale} copy={copy} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
