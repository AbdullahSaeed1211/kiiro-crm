'use client'
/* eslint-disable complexity, max-lines-per-function -- one compact list owns rename, cancel, and delete feedback. */

import { deleteConfiguration, saveConfiguration, setSavedViewState } from '../../../../server/actions/settings'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

function recordTypeLabel(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}s`
}

export function SavedViewList({
  views,
}: Readonly<{
  views: readonly {
    id: string
    recordType: string
    name: string
    kind: string
    ownerId: string | null
    pinned: boolean
    isDefault: boolean
  }[]
}>) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editingId !== null && window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus()
  }, [editingId])
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
                  className="h-8 w-full rounded-md border bg-background px-2"
                  maxLength={120}
                  ref={inputRef}
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
            <span className="flex shrink-0 flex-wrap items-center justify-end gap-3">
              <span className="text-xs text-muted-foreground">
                {recordTypeLabel(view.recordType)} · {view.ownerId === null ? 'Shared' : 'Personal'} · {view.kind}
              </span>
              {view.pinned ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">Pinned</span> : null}
              {view.isDefault ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Default</span>
              ) : null}
              <button
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={pendingId !== null || editingId !== null}
                type="button"
                aria-pressed={view.pinned}
                onClick={() => {
                  setPendingId(view.id)
                  setError('')
                  void setSavedViewState({ id: view.id, pinned: !view.pinned }).then((result) => {
                    setPendingId(null)
                    if (!result.ok) setError(result.error)
                    else router.refresh()
                  })
                }}
              >
                {view.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={pendingId !== null || editingId !== null || view.isDefault}
                type="button"
                aria-pressed={view.isDefault}
                onClick={() => {
                  setPendingId(view.id)
                  setError('')
                  void setSavedViewState({ id: view.id, isDefault: true }).then((result) => {
                    setPendingId(null)
                    if (!result.ok) setError(result.error)
                    else router.refresh()
                  })
                }}
              >
                {view.isDefault ? 'Default' : 'Set default'}
              </button>
              {editingId === view.id ? (
                <>
                  <button
                    className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
                className="text-xs text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
