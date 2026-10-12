'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import { BILLING_COPY, type BillingCopy } from '../../../i18n/billing-copy'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { readApi, type ApiResult } from '../api-client'
import { addressesOf, looksLikeEmail } from '../email-addresses'
import type { EmailDraft } from './billing-email-draft'

interface Target {
  readonly id: string
  readonly organizationId: string
  readonly status: string
  readonly updatedAt: number
  readonly defaultTo: string
  readonly draft: EmailDraft
}

interface Form {
  readonly to: string
  readonly subject: string
  readonly message: string
}

/** POSTs JSON to the product API; a dropped connection becomes a failure carrying `fallback`. */
async function postJson(input: Readonly<{ url: string; body: object; fallback: string }>): Promise<ApiResult<unknown>> {
  const response = await fetch(input.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input.body),
  }).catch(() => undefined)
  if (response === undefined) return { ok: false, code: 'NETWORK', message: input.fallback }
  return readApi(response, input.fallback)
}

/** Checks the form, sends the email and, for a draft, marks it sent. Returns '' on success, else the message to show. */
async function deliver(input: Readonly<{ form: Form; target: Target; copy: BillingCopy }>): Promise<string> {
  const { form, target, copy } = input
  const to = addressesOf(form.to)
  if (to.length === 0 || !to.every(looksLikeEmail)) return copy.emailBadAddress
  if (form.subject.trim() === '' || form.message.trim() === '') return copy.emailNeedAll
  const sent = await postJson({
    url: '/api/v1/email/send',
    body: {
      recordType: 'organization',
      recordId: target.organizationId,
      to,
      subject: form.subject.trim(),
      textBody: form.message.trim(),
    },
    fallback: copy.emailSendFailed,
  })
  if (!sent.ok) return copy.emailSendFailed
  if (target.status !== 'draft') return ''
  const status = await postJson({
    url: `/api/v1/billing/${target.id}/status`,
    body: { expectedUpdatedAt: target.updatedAt, to: 'sent' },
    fallback: copy.emailStatusFailed,
  })
  return status.ok ? '' : copy.emailStatusFailed
}

type Field = keyof Form

interface FormProps {
  readonly copy: BillingCopy
  readonly form: Form
  readonly busy: boolean
  readonly error: string
  readonly onField: (name: Field) => (event: { target: { value: string } }) => void
  readonly onSubmit: (event: SyntheticEvent) => void
  readonly onCancel: () => void
}

/** The To, Subject and Message fields with Send and Cancel. */
function EmailForm({ copy, form, busy, error, onField, onSubmit, onCancel }: Readonly<FormProps>) {
  return (
    <form
      className="grid max-w-3xl gap-2 rounded-lg border bg-muted/20 p-3"
      onSubmit={(event) => {
        onSubmit(event)
      }}
    >
      <label className="grid gap-1 text-sm" htmlFor="billing-email-to">
        {copy.emailTo}
        <Input id="billing-email-to" type="text" value={form.to} onChange={onField('to')} disabled={busy} />
      </label>
      <label className="grid gap-1 text-sm" htmlFor="billing-email-subject">
        {copy.emailSubject}
        <Input id="billing-email-subject" value={form.subject} onChange={onField('subject')} disabled={busy} />
      </label>
      <label className="grid gap-1 text-sm" htmlFor="billing-email-message">
        {copy.emailMessage}
        <Textarea
          id="billing-email-message"
          rows={10}
          value={form.message}
          onChange={onField('message')}
          disabled={busy}
        />
      </label>
      {error === '' ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? copy.emailSending : copy.emailSend}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            onCancel()
          }}
        >
          {copy.emailCancel}
        </Button>
      </div>
    </form>
  )
}

/** "Email to client" on a quote or invoice: an inline form with To, Subject and Message, then Send. */
export function BillingEmail({ target }: Readonly<{ target: Target }>) {
  const copy = catalogFor(BILLING_COPY, useLocale())
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<Form>({
    to: target.defaultTo,
    subject: target.draft.subject,
    message: target.draft.message,
  })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  if (target.status === 'void') return null
  const onField = (name: Field) => (event: { target: { value: string } }) => {
    setForm({ ...form, [name]: event.target.value })
  }
  const submit = async (event: SyntheticEvent) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    const failure = await deliver({ form, target, copy })
    setBusy(false)
    setError(failure)
    if (failure === '') setNotice(copy.emailSent)
    router.refresh()
  }
  return (
    <section className="grid gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open)
          }}
        >
          {copy.emailButton}
        </Button>
        {notice === '' ? null : (
          <p role="status" className="text-sm">
            {notice}
          </p>
        )}
      </div>
      {open ? (
        <EmailForm
          copy={copy}
          form={form}
          busy={busy}
          error={error}
          onField={onField}
          onSubmit={(event) => {
            void submit(event)
          }}
          onCancel={() => {
            setOpen(false)
          }}
        />
      ) : null}
    </section>
  )
}
