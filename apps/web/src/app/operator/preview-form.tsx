/* eslint-disable @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-unnecessary-type-assertion -- compact operator form keeps submit feedback local. */
'use client'

import { useState } from 'react'

export function OperatorPreviewForm() {
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [result, setResult] = useState<{ plan: { label: string; key: string }[]; idempotencyKey: string } | null>(null)
  const [message, setMessage] = useState('')
  const submit = async () => {
    const response = await fetch('/api/v1/operator/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, displayName }),
    })
    const data = (await response.json()) as {
      error?: string
      plan?: { label: string; key: string }[]
      idempotencyKey?: string
    }
    if (!response.ok || !data.plan || !data.idempotencyKey) {
      setMessage(data.error ?? 'Unable to preview.')
      return
    }
    setResult({ plan: data.plan, idempotencyKey: data.idempotencyKey })
    setMessage('Reviewed plan ready. No remote side effects were started.')
  }
  return (
    <section className="grid gap-6 md:grid-cols-[18rem_1fr]">
      <form
        className="grid content-start gap-3 border p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="grid gap-1 text-sm">
          Tenant slug
          <input
            className="h-9 border px-3"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            pattern="[a-z][a-z0-9-]{1,39}"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Display name
          <input
            className="h-9 border px-3"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </label>
        <button className="h-9 bg-primary px-3 text-sm font-medium text-primary-foreground" type="submit">
          Preview plan
        </button>
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      </form>
      <div className="border p-4">
        <h2 className="text-sm font-medium">Provision steps</h2>
        {result ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">Idempotency key: {result.idempotencyKey}</p>
            <ol className="mt-4 space-y-2 text-sm">
              {result.plan.map((step, index) => (
                <li className="flex gap-3 border-t pt-2" key={step.key}>
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                  {step.label}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Enter tenant inputs to generate a reviewed plan.</p>
        )}
      </div>
    </section>
  )
}
