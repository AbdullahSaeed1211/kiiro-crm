'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { SavedViewMenu } from '@ops/ui/composites/Collaboration/Primitives'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../use-guarded-transition'
import { saveLeadView } from '../../../server/actions/crm/lead-views'

export type LeadViewLink = Readonly<{ id: string; label: string; query: string }>

/** Saved views for the lead list: pick one to apply its filters, or save the current filters under a name. */
export function LeadViewControls({ views }: Readonly<{ views: readonly LeadViewLink[] }>) {
  const router = useRouter()
  const search = useSearchParams()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setError)
  const save = () => {
    startTransition(async () => {
      const result = await saveLeadView({
        name,
        filter: {
          q: search.get('q') ?? undefined,
          stages: search.getAll('stage'),
          source: search.get('source') ?? undefined,
          owner: search.get('owner') ?? undefined,
        },
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setName('')
      setError(null)
      setNaming(false)
      router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SavedViewMenu
        views={views}
        onSelect={(id) => {
          const view = views.find((candidate) => candidate.id === id)
          if (view !== undefined) router.push(view.query === '' ? '/leads' : `/leads?${view.query}`)
        }}
      />
      {naming ? (
        <>
          <Input
            aria-label="View name"
            className="h-7 w-40"
            placeholder="View name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
            }}
          />
          <Button size="sm" disabled={name.trim() === '' || pending} onClick={save}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNaming(false)
            }}
          >
            Cancel
          </Button>
          {error === null ? null : (
            <span role="alert" className="text-xs text-destructive">
              {error}
            </span>
          )}
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setNaming(true)
          }}
        >
          Save view
        </Button>
      )}
    </div>
  )
}
