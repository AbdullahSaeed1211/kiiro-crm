'use client'

import { SavedViewMenu } from '@ops/ui/composites/Collaboration/Primitives'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TASK_COPY, type Locale } from '../../../i18n/config'

export function TaskViewMenu({
  selectedId,
  customViews = [],
  locale = 'en',
}: Readonly<{
  selectedId: string
  customViews?: readonly { id: string; label: string; pinned?: boolean }[]
  locale?: Locale
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const copy = TASK_COPY[locale]
  return (
    <SavedViewMenu
      selectedId={selectedId}
      views={[
        { id: 'all', label: copy.allTasks, pinned: true },
        { id: 'open', label: copy.openTasks },
        { id: 'mine', label: copy.myTasks },
        ...customViews,
      ]}
      onSelect={(id) => {
        const params = new URLSearchParams(searchParams.toString())
        if (id === 'all') params.delete('view')
        else params.set('view', id)
        params.delete('page')
        const query = params.toString()
        router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false })
      }}
    />
  )
}
