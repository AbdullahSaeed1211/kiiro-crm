'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApi } from './api-client'

export function RecordActivityComposer({
  recordType,
  recordId,
}: Readonly<{ recordType: 'contact' | 'organization'; recordId: string }>) {
  const [body, setBody] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  async function submit() {
    const trimmed = body.trim()
    if (trimmed === '' || submitting) return
    setSubmitting(true)
    setMessage(null)
    try {
      const response = await fetch('/api/v1/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recordType, recordId, body: trimmed }),
      })
      const result = await readApi(response, 'Unable to add comment.')
      if (!result.ok) throw new Error(result.message)
      setBody('')
      setMessage('Comment added.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add comment.')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="mb-4 rounded-xl border bg-card p-4">
      <label htmlFor="record-comment" className="text-sm font-medium">
        Add a comment
      </label>
      <Textarea
        id="record-comment"
        className="mt-2 min-h-20 resize-y"
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
          setMessage(null)
        }}
        placeholder="Write an update for your team…"
        disabled={submitting}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {message ?? 'Mention teammates with @name.'}
        </span>
        <Button type="button" size="sm" disabled={submitting || body.trim() === ''} onClick={() => void submit()}>
          {submitting ? 'Posting…' : 'Post comment'}
        </Button>
      </div>
    </div>
  )
}
