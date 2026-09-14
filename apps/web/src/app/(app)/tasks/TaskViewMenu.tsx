'use client'

import { SavedViewMenu } from '@ops/ui/composites/Collaboration/Primitives'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export function TaskViewMenu({
  selectedId,
  customViews = [],
}: Readonly<{
  selectedId: string
  customViews?: readonly { id: string; label: string; pinned?: boolean }[]
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  return (
    <SavedViewMenu
      selectedId={selectedId}
      views={[
        { id: 'all', label: 'All tasks', pinned: true },
        { id: 'open', label: 'Open tasks' },
        { id: 'mine', label: 'My tasks' },
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
