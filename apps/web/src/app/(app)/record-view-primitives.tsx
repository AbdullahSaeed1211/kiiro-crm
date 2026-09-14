import { Card, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { ActivityFeed } from '@ops/ui/composites/ActivityFeed'
import type { RecordPageTab } from '@ops/ui/composites/RecordPageLayout'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ActivityItem, EmailThreadMessage } from '../../server/crm/directory/data'
import { hasRelationItems } from '../../server/crm/directory/utils'
import { RecordActivityComposer } from './record-activity-composer'
import { RecordEmailThread } from './record-email-thread'

const DATE_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}

export function DateCell({ value }: Readonly<{ value: number }>) {
  return (
    <time dateTime={new Date(value).toISOString()} className="tabular-nums text-muted-foreground">
      {DATE_FORMAT.format(value)}
    </time>
  )
}

export function Activity({
  entries,
  recordType,
  recordId,
}: Readonly<{ entries: readonly ActivityItem[]; recordType: 'contact' | 'organization'; recordId: string }>) {
  return (
    <>
      <RecordActivityComposer recordType={recordType} recordId={recordId} />
      <ActivityFeed
        entries={entries.map((entry) => ({
          id: entry.id,
          occurredAt: entry.occurredAt,
          actorName: entry.actorName,
          summary: entry.summary,
        }))}
        labels={{
          heading: 'Activity',
          empty: 'No activity recorded yet.',
          loadMore: 'Load more',
          systemActor: 'System',
        }}
      />
    </>
  )
}

export function RelationList({ items, empty }: Readonly<{ items: readonly ReactNode[]; empty: string }>) {
  return (
    <div className="divide-y rounded-lg border">
      {hasRelationItems(items) ? items : <p className="p-4 text-sm text-muted-foreground">{empty}</p>}
    </div>
  )
}

export function RelationRow({ href, title, detail }: Readonly<{ href: string; title: string; detail?: string }>) {
  return (
    <a
      href={href}
      className="flex items-center justify-between gap-3 rounded-sm p-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{title}</span>
        {detail === undefined ? null : <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
      <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </a>
  )
}

export function DetailCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function Meta({ createdAt, updatedAt }: Readonly<{ createdAt: number; updatedAt: number }>) {
  return (
    <dl className="grid gap-3 text-sm">
      <div>
        <dt className="text-xs text-muted-foreground">Created</dt>
        <dd>
          <DateCell value={createdAt} />
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Last updated</dt>
        <dd>
          <DateCell value={updatedAt} />
        </dd>
      </div>
    </dl>
  )
}

export function recordTabs(
  activity: ReactNode,
  emailMessages: readonly EmailThreadMessage[] = [],
): readonly RecordPageTab[] {
  return [
    { id: 'activity', label: 'Activity', content: activity },
    { id: 'email', label: 'Email', content: <RecordEmailThread messages={emailMessages} /> },
  ]
}
