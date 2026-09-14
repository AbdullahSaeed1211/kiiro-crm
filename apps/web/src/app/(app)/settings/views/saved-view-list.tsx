'use client'

import { deleteConfiguration } from '../../../../server/actions/settings'
import { useState } from 'react'

function recordTypeLabel(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}s`
}

export function SavedViewList({
  views,
}: Readonly<{
  views: readonly { id: string; recordType: string; name: string; kind: string; ownerId: string | null }[]
}>) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  if (views.length === 0) return <p className="text-sm text-muted-foreground">No saved views yet.</p>
  return (
    <>
      <ul className="divide-y rounded-lg border" aria-label="Saved views">
        {views.map((view) => (
          <li className="flex items-center justify-between gap-3 px-3 py-2 text-sm" key={view.id}>
            <span className="min-w-0 truncate font-medium">{view.name}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {recordTypeLabel(view.recordType)} · {view.ownerId === null ? 'Shared' : 'Personal'} · {view.kind}
              </span>
              <button
                className="text-xs text-destructive underline-offset-2 hover:underline disabled:opacity-50"
                disabled={pendingId !== null}
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete “${view.name}”?`)) return
                  setPendingId(view.id)
                  setError('')
                  void deleteConfiguration({ collection: 'savedViews', id: view.id }).then((result) => {
                    setPendingId(null)
                    if (!result.ok) setError(result.error)
                  })
                }}
              >
                {pendingId === view.id ? 'Deleting…' : 'Delete'}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {error !== '' ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
