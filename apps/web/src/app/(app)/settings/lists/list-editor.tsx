'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { catalogFor } from '../../../../i18n/locale'
import { LISTS_COPY } from '../../../../i18n/lists-copy'
import { useLocale } from '../../../../i18n/locale-context'
import { useGuardedTransition } from '../../use-guarded-transition'
import { addListItem, removeListItem } from '../../../../server/actions/settings/lists'

export interface ListItem {
  readonly id: string
  readonly name: string
}

/** One editable list: its items with a Remove button each, and a field to add another. */
export function ListEditor({ kind, items }: Readonly<{ kind: 'source' | 'lostReason'; items: readonly ListItem[] }>) {
  const copy = catalogFor(LISTS_COPY, useLocale())
  const { title, help } = copy[kind]
  const router = useRouter()
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
  const run = (work: () => Promise<{ ok: boolean; error?: { message: string } }>, after: () => void) => {
    startTransition(async () => {
      const result = await work()
      if (result.ok) {
        after()
        setMessage(null)
        router.refresh()
      } else setMessage(result.error?.message ?? copy.failed)
    })
  }
  return (
    <div className="grid gap-3 text-sm">
      <h2 className="font-medium">{title}</h2>
      <p className="text-muted-foreground">{help}</p>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
              <span>{item.name}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={copy.removeAria.replace('{name}', item.name)}
                onClick={() => {
                  run(
                    () => removeListItem({ kind, id: item.id }),
                    () => undefined,
                  )
                }}
              >
                {copy.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={copy.newEntryAria.replace('{list}', title.toLowerCase())}
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
          {copy.add}
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
