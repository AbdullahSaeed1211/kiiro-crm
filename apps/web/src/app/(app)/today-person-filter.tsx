'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import { useRouter } from 'next/navigation'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardWork } from '../../server/queries/work/dashboard-work'

/** A secondary manager filter; the server supplies only people this manager may oversee. */
export function TodayPersonFilter({ work }: Readonly<{ work: DashboardWork }>) {
  const router = useRouter()
  if (!work.team || work.people.length === 0) return null
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="today-person-filter" className="text-sm text-muted-foreground">
        {copy.personFilter}
      </label>
      <Select
        value={work.personFilter}
        onValueChange={(person) => {
          if (person === null) return
          const query = new URLSearchParams({ scope: 'team' })
          if (person !== 'everyone') query.set('person', person)
          router.push(`/?${query.toString()}`)
        }}
      >
        <SelectTrigger id="today-person-filter" size="sm" className="w-full max-w-64">
          <SelectValue>{(selected: string) => personFilterLabel(selected, work)}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
          <SelectItem value="everyone">{copy.everyone}</SelectItem>
          <SelectItem value="unassigned">{copy.unassignedWork}</SelectItem>
          {work.people.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              {person.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function personFilterLabel(selected: string, work: DashboardWork): string {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  if (selected === 'everyone') return copy.everyone
  if (selected === 'unassigned') return copy.unassignedWork
  return work.people.find((person) => person.id === selected)?.name ?? copy.everyone
}
