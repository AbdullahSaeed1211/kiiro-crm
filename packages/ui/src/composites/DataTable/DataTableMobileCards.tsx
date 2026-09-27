'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { isInteractiveElement } from './row-click'
import type { DataTableMobileCard, DataTableRow } from './types'

export function DataTableMobileCards({
  rows,
  mobileCard,
}: Readonly<{
  rows: readonly DataTableRow[]
  mobileCard: DataTableMobileCard
}>) {
  const router = useRouter()

  const handleCardClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, href: string) => {
      const target = event.target as HTMLElement
      if (isInteractiveElement(target)) return
      router.push(href)
    },
    [router],
  )

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div
          key={row.id}
          onClick={(e) => {
            if (row.href) handleCardClick(e, row.href)
          }}
          className={row.href !== undefined ? 'cursor-pointer' : undefined}
        >
          <div className="space-y-2 rounded-lg border bg-card p-3">
            {mobileCard.cells.map((cellId, idx) => {
              const content = row.cells[cellId]
              if (content === undefined) return null
              return (
                <div key={cellId} className={idx === 0 ? 'font-medium text-base' : 'text-sm text-muted-foreground'}>
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
