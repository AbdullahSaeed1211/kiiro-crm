import { NativeSelect } from '@ops/ui/components/ui/native-select'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ACTIVITY_LOG_COPY } from '../../../../i18n/activity-log-copy'

export type Copy = (typeof ACTIVITY_LOG_COPY)['en']

/** The first page size is shared by both logs. */
export const PAGE_SIZE = 50

export const withPage = (input: Readonly<{ path: string; base: string; page: number }>): string =>
  `${input.path}?${input.base}${input.base === '' ? '' : '&'}page=${String(input.page)}`

export function Pager({
  copy,
  page,
  total,
  base,
  path,
}: Readonly<{ copy: Copy; page: number; total: number; base: string; path: string }>) {
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const first = (page - 1) * PAGE_SIZE + 1
  return (
    <nav className="flex items-center justify-between gap-2 text-xs text-muted-foreground" aria-label="Pages">
      <span className="tabular-nums">
        {copy.range
          .replace('{from}', String(first))
          .replace('{to}', String(Math.min(page * PAGE_SIZE, total)))
          .replace('{total}', String(total))}
      </span>
      <span className="flex gap-3">
        {page > 1 ? <Link href={withPage({ path, base, page: page - 1 })}>{copy.previous}</Link> : null}
        {page < last ? <Link href={withPage({ path, base, page: page + 1 })}>{copy.next}</Link> : null}
      </span>
    </nav>
  )
}

export function Pick({
  label,
  name,
  value,
  children,
}: Readonly<{ label: string; name: string; value: string; children: ReactNode }>) {
  return (
    <label className="grid gap-1">
      <span className="font-medium">{label}</span>
      <NativeSelect name={name} defaultValue={value}>
        {children}
      </NativeSelect>
    </label>
  )
}

export function DateField({ label, name, value }: Readonly<{ label: string; name: string; value: string }>) {
  return (
    <label className="grid gap-1">
      <span className="font-medium">{label}</span>
      <input name={name} type="date" defaultValue={value} className="h-8 rounded-lg border bg-background px-2" />
    </label>
  )
}
