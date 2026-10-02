'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useState } from 'react'
import { useGuardedTransition } from '../../use-guarded-transition'
import { createCalendarFeed, removeCalendarFeed } from '../../../../server/actions/settings/calendar-feed'

const feedUrl = (token: string): string => `${window.location.origin}/api/v1/calendar/${token}.ics`

/** A private calendar address for the signed-in user's task due dates and lead follow-ups. */
export function CalendarFeedCard({ hasFeed }: Readonly<{ hasFeed: boolean }>) {
  const [token, setToken] = useState<string | null>(null)
  const [on, setOn] = useState(hasFeed)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
  const make = () => {
    startTransition(async () => {
      const result = await createCalendarFeed()
      if (result.ok) {
        setToken(result.data.token)
        setOn(true)
        setMessage(null)
      } else setMessage(result.error.message)
    })
  }
  const remove = () => {
    startTransition(async () => {
      const result = await removeCalendarFeed()
      if (result.ok) {
        setToken(null)
        setOn(false)
      }
      setMessage(result.ok ? 'Feed turned off.' : result.error.message)
    })
  }
  return (
    <div className="grid gap-2">
      {token === null ? null : (
        <>
          <Input readOnly aria-label="Calendar feed address" className="font-mono text-xs" value={feedUrl(token)} />
          <p className="text-muted-foreground">
            Add it in your calendar app as a subscription by address (Google Calendar: Other calendars, From URL).
            Anyone with the address can read your due dates, so keep it private and make a new one if it leaks.
          </p>
        </>
      )}
      {on && token === null ? (
        <p className="text-muted-foreground">
          Your feed is on. Its address is shown only when made; make a new one to see it again (the old one stops
          working).
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={make}>
          {on ? 'Make a new address' : 'Turn on calendar feed'}
        </Button>
        {on ? (
          <Button variant="ghost" size="sm" disabled={pending} onClick={remove}>
            Turn off
          </Button>
        ) : null}
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
