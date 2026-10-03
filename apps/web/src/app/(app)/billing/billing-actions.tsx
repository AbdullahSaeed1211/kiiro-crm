'use client'

import { Button } from '@ops/ui/components/ui/button'
import { canMove, type DocumentKind, type DocumentStatus } from '@ops/module-billing'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BILLING_COPY } from '../../../i18n/billing-copy'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { readApi } from '../api-client'

const MOVES: readonly DocumentStatus[] = ['sent', 'accepted', 'declined', 'paid', 'void']

interface Target {
  readonly id: string
  readonly kind: DocumentKind
  readonly status: DocumentStatus
  readonly updatedAt: number
}

interface Posted {
  readonly message: string
  readonly id: string
}

/** Posts to a billing action URL; `message` is empty on success and `id` is the saved document. */
async function post(input: Readonly<{ url: string; body: object; fallback: string }>): Promise<Posted> {
  const response = await fetch(input.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input.body),
  }).catch(() => undefined)
  if (response === undefined) return { message: input.fallback, id: '' }
  const result = await readApi<{ id: string }>(response, input.fallback)
  return result.ok ? { message: '', id: result.data.id } : { message: result.message, id: '' }
}

/** The buttons that move a document on: its next states, the quote-to-invoice copy, edit for a draft, and print. */
export function BillingActions({ target }: Readonly<{ target: Target }>) {
  const copy = catalogFor(BILLING_COPY, useLocale())
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (task: () => Promise<Posted>) => {
    setBusy(true)
    const done = await task()
    setError(done.message)
    setBusy(false)
    if (done.message === '' && done.id !== '' && target.kind === 'quote' && target.status === 'accepted') {
      router.push(`/billing/${done.id}`)
      return
    }
    router.refresh()
  }
  const base = `/api/v1/billing/${target.id}`
  const move = (to: DocumentStatus) =>
    run(() =>
      post({ url: `${base}/status`, body: { expectedUpdatedAt: target.updatedAt, to }, fallback: copy.saveFailed }),
    )
  const makeInvoice = () => run(() => post({ url: `${base}/invoice`, body: {}, fallback: copy.saveFailed }))
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {MOVES.filter((to) => canMove(target.kind, target.status, to)).map((to) => (
        <Button
          key={to}
          size="sm"
          variant={to === 'void' ? 'outline' : 'default'}
          disabled={busy}
          onClick={() => void move(to)}
        >
          {copy.actions[to]}
        </Button>
      ))}
      {target.kind === 'quote' && target.status === 'accepted' ? (
        <Button size="sm" disabled={busy} onClick={() => void makeInvoice()}>
          {copy.makeInvoice}
        </Button>
      ) : null}
      {target.status === 'draft' ? (
        <Link
          className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm"
          href={`/billing/${target.id}/edit`}
        >
          {copy.edit}
        </Link>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          window.print()
        }}
      >
        {copy.print}
      </Button>
      {error === '' ? null : (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
