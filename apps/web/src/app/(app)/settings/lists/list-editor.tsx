'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addListItem, removeListItem } from '../../../../server/actions/settings/lists'

export interface ListItem {
  readonly id: string
  readonly name: string
}

/** One editable list: its items with a Remove button each, and a field to add another. */
export function ListEditor({
  kind,
  title,
  help,
  items,
}: Readonly<{ kind: 'source' | 'lostReason'; title: string; help: string; items: readonly ListItem[] }>) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const run = (work: () => Promise<{ ok: boolean; error?: { message: string } }>, after: () => void) => {
    startTransition(async () => {
      const result = await work()
      if (result.ok) {
        after()
        setMessage(null)
        router.refresh()
      } else setMessage(result.error?.message ?? 'Unable to save.')
    })
  }
  return (
    <div className="grid gap-3 text-sm">
      <h2 className="font-medium">{title}</h2>
      <p className="text-muted-foreground">{help}</p>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Nothing here yet. Add the first one below.</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
              <span>{item.name}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={`Remove ${item.name}`}
                onClick={() => {
                  run(
                    () => removeListItem({ kind, id: item.id }),
                    () => undefined,
                  )
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={`New ${title.toLowerCase()} entry`}
          className="max-w-64"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={pending || name.trim() === ''}
          onClick={() => {
            run(
              () => addListItem({ kind, name }),
              () => {
                setName('')
              },
            )
          }}
        >
          Add
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
