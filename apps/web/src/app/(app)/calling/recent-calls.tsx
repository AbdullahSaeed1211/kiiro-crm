'use client'

import type { VoiceSnapshot } from '@ops/module-crm'
import type { CallingCopy } from '../../../i18n/calling-copy'

export function RecentCalls({
  snapshot,
  locale,
  copy,
}: Readonly<{ snapshot: VoiceSnapshot; locale: string; copy: CallingCopy }>) {
  const calls = snapshot.calls.slice(0, 8)
  if (calls.length === 0) return <p className="text-sm text-muted-foreground">{copy.empty}</p>
  return (
    <ul className="divide-y">
      {calls.map((call) => (
        <li key={call.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span className="min-w-0 truncate">{call.direction === 'inbound' ? call.from : call.to}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(call.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}
