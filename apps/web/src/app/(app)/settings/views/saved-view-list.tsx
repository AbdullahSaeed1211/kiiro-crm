'use client'
/* eslint-disable complexity, max-lines-per-function -- one compact list owns rename, cancel, and delete feedback. */

import { deleteConfiguration, saveConfiguration } from '../../../../server/actions/settings'
import { useRouter } from 'next/navigation'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  if (views.length === 0) return <p className="text-sm text-muted-foreground">No saved views yet.</p>
  return (
    <>
      <ul className="divide-y rounded-lg border" aria-label="Saved views">
        {views.map((view) => (
          <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm" key={view.id}>
            {editingId === view.id ? (
              <label className="min-w-48 flex-1">
                <span className="sr-only">Saved view name</span>
                <input
                  autoFocus
                  className="h-8 w-full rounded-md border bg-background px-2"
                  maxLength={120}
                  value={draftName}
                  onChange={(event) => {
                    setDraftName(event.target.value)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setEditingId(null)
                      setDraftName('')
                    }
                  }}
                />
              </label>
            ) : (
              <span className="min-w-48 flex-1 truncate font-medium">{view.name}</span>
            )}
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {recordTypeLabel(view.recordType)} · {view.ownerId === null ? 'Shared' : 'Personal'} · {view.kind}
              </span>
              {editingId === view.id ? (
                <>
                  <button
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
                    disabled={pendingId !== null || draftName.trim() === ''}
                    type="button"
                    onClick={() => {
                      const name = draftName.trim()
                      if (name === '') return
                      setPendingId(view.id)
                      setError('')
                      void saveConfiguration({ collection: 'savedViews', id: view.id, name }).then((result) => {
                        setPendingId(null)
                        if (!result.ok) {
                          setError(result.error)
                          return
                        }
                        setEditingId(null)
                        setDraftName('')
                        router.refresh()
                      })
                    }}
                  >
                    {pendingId === view.id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
                    disabled={pendingId !== null}
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setDraftName('')
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
                  disabled={pendingId !== null || editingId !== null}
                  type="button"
                  onClick={() => {
                    setEditingId(view.id)
                    setDraftName(view.name)
                    setError('')
                  }}
                >
                  Edit
                </button>
              )}
              <button
                className="text-xs text-destructive underline-offset-2 hover:underline disabled:opacity-50"
                disabled={pendingId !== null || editingId !== null}
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
