'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApi } from './api-client'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { RECORD_COPY } from '../../i18n/record-copy'

export function RecordActivityComposer({
  recordType,
  recordId,
}: Readonly<{ recordType: 'contact' | 'organization'; recordId: string }>) {
  const copy = catalogFor(RECORD_COPY, useLocale())
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
      const result = await readApi(response, copy.commentFailed)
      if (!result.ok) throw new Error(result.message)
      setBody('')
      setMessage(copy.commentAdded)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.commentFailed)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <div className="mb-4 rounded-xl border bg-card p-4">
      <label htmlFor="record-comment" className="text-sm font-medium">
        {copy.addComment}
      </label>
      <Textarea
        id="record-comment"
        className="mt-2 min-h-20 resize-y"
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
          setMessage(null)
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !submitting && body.trim() !== '') {
            event.preventDefault()
            void submit()
          }
        }}
        placeholder={copy.writeUpdate}
        disabled={submitting}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {message ?? copy.mentionHint}
        </span>
        <Button type="button" size="sm" disabled={submitting || body.trim() === ''} onClick={() => void submit()}>
          {submitting ? copy.posting : copy.postComment}
        </Button>
      </div>
    </div>
  )
}
