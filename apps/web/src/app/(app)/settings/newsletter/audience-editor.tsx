'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../../use-guarded-transition'
import { saveAudiences } from '../../../../server/actions/newsletter'

/** Audience names, one per line. A contact can be in several; a campaign can go to one audience or to everyone. */
export function AudienceEditor({ names }: Readonly<{ names: readonly string[] }>) {
  const router = useRouter()
  const [text, setText] = useState(names.join('\n'))
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
  const save = () => {
    startTransition(async () => {
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      const result = await saveAudiences(lines)
      setMessage(result.ok ? 'Saved.' : result.error.message)
      if (result.ok) router.refresh()
    })
  }
  return (
    <section aria-label="Audiences" className="grid gap-2 text-sm">
      <h3 className="font-medium">Audiences</h3>
      <p className="text-muted-foreground">
        Name your lists, one per line, such as "Clients" or "Prospects". Then tick the audiences on each contact. Leave
        this empty to send to everyone who subscribed.
      </p>
      <Textarea
        aria-label="Audience names"
        className="min-h-24"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
        }}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={save}>
          Save audiences
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </section>
  )
}
