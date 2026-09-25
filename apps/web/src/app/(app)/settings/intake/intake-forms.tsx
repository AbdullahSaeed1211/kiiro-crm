'use client'
/* eslint-disable max-lines, max-lines-per-function, complexity -- this screen keeps each form's security and delivery controls together. */

import { useRouter } from 'next/navigation'
import { useState, type ChangeEvent, type SyntheticEvent } from 'react'
import type { ActionResult } from '../../../../server/actions/settings'

export interface IntakeOption {
  readonly id: string
  readonly name: string
}

export interface IntakeSubmissionView {
  readonly id: string
  readonly channel: 'web' | 'server' | 'email'
  readonly status: 'accepted' | 'duplicate' | 'rejected_spam' | 'rejected_invalid'
  readonly receivedAt: number
}

export interface IntakeFormView {
  readonly id: string
  readonly name: string
  readonly key: string
  readonly active: boolean
  readonly allowedOrigins: readonly string[]
  readonly requireTurnstile: boolean
  readonly defaultOwnerId?: string
  readonly defaultAssigneeIds: readonly string[]
  readonly defaultSourceId?: string
  readonly notifyUserIds: readonly string[]
  readonly notifyGroupIds: readonly string[]
  readonly successMessage: string
  readonly redirectUrl: string
  readonly emailAlias: string
  readonly serverKeyCount: number
  readonly submissions: readonly IntakeSubmissionView[]
}

type Action = (input: unknown) => Promise<ActionResult>
const inputClass = 'h-10 rounded-md border bg-background px-3 text-sm'
const textAreaClass = 'min-h-24 rounded-md border bg-background px-3 py-2 text-sm'

function selectedValues(event: ChangeEvent<HTMLSelectElement>): string[] {
  return Array.from(event.currentTarget.selectedOptions, (option) => option.value)
}

function resultMessage(result: ActionResult | undefined): string | undefined {
  if (result?.ok === false) return result.error.message
  if (result?.ok === true) return 'Saved.'
  return undefined
}

type RotateKeyAction = (input: unknown) => Promise<ActionResult<{ serverKey: string }>>

function OptionSelect({
  label,
  options,
  value,
  multiple = false,
  onChange,
}: Readonly<{
  label: string
  options: readonly IntakeOption[]
  value: string | readonly string[]
  multiple?: boolean
  onChange: (value: string | string[]) => void
}>) {
  const values: string[] = typeof value === 'string' ? [value] : [...value]
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className={`${inputClass}${multiple ? ' min-h-24 py-2' : ''}`}
        multiple={multiple}
        onChange={(event) => {
          onChange(multiple ? selectedValues(event) : event.currentTarget.value)
        }}
        value={multiple ? values : (values[0] ?? '')}
      >
        {!multiple && <option value="">None</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {multiple && <span className="text-xs text-muted-foreground">Hold Cmd/Ctrl to select more than one.</span>}
    </label>
  )
}

export function IntakeCreateForm({ action }: Readonly<{ action: Action }>) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [result, setResult] = useState<ActionResult | undefined>()
  const [pending, setPending] = useState(false)
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const response = await action({ name, key })
      setResult(response)
      if (response.ok) {
        setName('')
        setKey('')
        router.refresh()
      }
    } catch {
      setResult({ ok: false, error: { code: 'INTERNAL', message: 'Could not create this form. Please try again.' } })
    } finally {
      setPending(false)
    }
  }
  return (
    <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => void submit(event)}>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Form name</span>
        <input
          className={inputClass}
          onChange={(event) => {
            setName(event.target.value)
          }}
          value={name}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Public key</span>
        <input
          className={inputClass}
          pattern="[a-z0-9-]{2,60}"
          onChange={(event) => {
            setKey(event.target.value.toLowerCase())
          }}
          placeholder="website-contact"
          value={key}
        />
      </label>
      <button
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Creating...' : 'Create form'}
      </button>
      {resultMessage(result) && (
        <p
          className={`text-sm sm:col-span-3 ${result?.ok === false ? 'text-destructive' : 'text-muted-foreground'}`}
          role={result?.ok === false ? 'alert' : 'status'}
        >
          {resultMessage(result)}
        </p>
      )}
    </form>
  )
}

export function IntakeFormEditor({
  action,
  form,
  groups,
  rotateServerKey,
  sources,
  users,
}: Readonly<{
  action: Action
  form: IntakeFormView
  groups: readonly IntakeOption[]
  rotateServerKey: RotateKeyAction
  sources: readonly IntakeOption[]
  users: readonly IntakeOption[]
}>) {
  const [values, setValues] = useState({
    name: form.name,
    key: form.key,
    active: form.active,
    allowedOrigins: form.allowedOrigins.join('\n'),
    requireTurnstile: form.requireTurnstile,
    defaultOwnerId: form.defaultOwnerId ?? '',
    defaultAssigneeIds: [...form.defaultAssigneeIds],
    defaultSourceId: form.defaultSourceId ?? '',
    notifyUserIds: [...form.notifyUserIds],
    notifyGroupIds: [...form.notifyGroupIds],
    successMessage: form.successMessage,
    redirectUrl: form.redirectUrl,
    emailAlias: form.emailAlias,
  })
  const [result, setResult] = useState<ActionResult | undefined>()
  const [keyResult, setKeyResult] = useState<ActionResult<{ serverKey: string }> | undefined>()
  const [pending, setPending] = useState(false)
  const [rotating, setRotating] = useState(false)
  const router = useRouter()
  const generatedKey = keyResult?.ok === true ? keyResult.data.serverKey : undefined
  const endpoint = `/api/v1/intake/${values.key}`
  const embedSnippet = `<form action="${endpoint}" method="post">
  <label>Email <input name="email" type="email" required></label>
  <label>Name <input name="name"></label>
  <label>Message <textarea name="message"></textarea></label>
  <button type="submit">Send</button>
</form>`
  const serverSnippet = `await fetch('${endpoint}', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-intake-key': '${generatedKey ?? '<generate a server key above>'}' },
  body: JSON.stringify({ name: 'Example', email: 'lead@example.com', message: 'Hello' }),
})`

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const response = await action({ id: form.id, ...values })
      setResult(response)
      if (response.ok) router.refresh()
    } catch {
      setResult({ ok: false, error: { code: 'INTERNAL', message: 'Could not save this form. Please try again.' } })
    } finally {
      setPending(false)
    }
  }

  async function generateServerKey() {
    setRotating(true)
    try {
      const response = await rotateServerKey({ id: form.id })
      setKeyResult(response)
      if (response.ok) router.refresh()
    } catch {
      setKeyResult({
        ok: false,
        error: { code: 'INTERNAL', message: 'Could not generate a server key. Please try again.' },
      })
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{form.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public endpoint: <code>{endpoint}</code>
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${values.active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}
        >
          {values.active ? 'Active' : 'Paused'}
        </span>
      </div>

      <form className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Form name</span>
            <input
              className={inputClass}
              onChange={(event) => {
                setValues((current) => ({ ...current, name: event.target.value }))
              }}
              value={values.name}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Public key</span>
            <input
              className={inputClass}
              onChange={(event) => {
                setValues((current) => ({ ...current, key: event.target.value.toLowerCase() }))
              }}
              value={values.key}
            />
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            checked={values.active}
            className="mt-1"
            onChange={(event) => {
              setValues((current) => ({ ...current, active: event.target.checked }))
            }}
            type="checkbox"
          />
          <span>
            <span className="font-medium">Accept submissions</span>
            <span className="block text-xs text-muted-foreground">Pause the endpoint without deleting the form.</span>
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Allowed browser origins</span>
            <textarea
              className={textAreaClass}
              onChange={(event) => {
                setValues((current) => ({ ...current, allowedOrigins: event.target.value }))
              }}
              placeholder="https://www.example.com"
              value={values.allowedOrigins}
            />
            <span className="text-xs text-muted-foreground">
              One exact http(s) origin per line. Wildcards and paths are rejected.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm sm:col-span-2">
            <input
              checked={values.requireTurnstile}
              className="mt-1"
              onChange={(event) => {
                setValues((current) => ({ ...current, requireTurnstile: event.target.checked }))
              }}
              type="checkbox"
            />
            <span>
              <span className="font-medium">Require Turnstile for browser submissions</span>
              <span className="block text-xs text-muted-foreground">
                Keep enabled in production unless this form is server-key or email only.
              </span>
            </span>
          </label>
        </div>

        <div className="border-t pt-5">
          <h3 className="font-medium">Routing defaults</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Accepted leads can be assigned and announced automatically.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <OptionSelect
              label="Default owner"
              options={users}
              onChange={(defaultOwnerId) => {
                setValues((current) => ({ ...current, defaultOwnerId: String(defaultOwnerId) }))
              }}
              value={values.defaultOwnerId}
            />
            <OptionSelect
              label="Default source"
              options={sources}
              onChange={(defaultSourceId) => {
                setValues((current) => ({ ...current, defaultSourceId: String(defaultSourceId) }))
              }}
              value={values.defaultSourceId}
            />
            <OptionSelect
              label="Default assignees"
              multiple
              options={users}
              onChange={(defaultAssigneeIds) => {
                setValues((current) => ({ ...current, defaultAssigneeIds: defaultAssigneeIds as string[] }))
              }}
              value={values.defaultAssigneeIds}
            />
            <OptionSelect
              label="Notify users"
              multiple
              options={users}
              onChange={(notifyUserIds) => {
                setValues((current) => ({ ...current, notifyUserIds: notifyUserIds as string[] }))
              }}
              value={values.notifyUserIds}
            />
            <OptionSelect
              label="Notify groups"
              multiple
              options={groups}
              onChange={(notifyGroupIds) => {
                setValues((current) => ({ ...current, notifyGroupIds: notifyGroupIds as string[] }))
              }}
              value={values.notifyGroupIds}
            />
          </div>
        </div>

        <div className="border-t pt-5">
          <h3 className="font-medium">Success behavior</h3>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Success message</span>
              <textarea
                className={textAreaClass}
                maxLength={500}
                onChange={(event) => {
                  setValues((current) => ({ ...current, successMessage: event.target.value }))
                }}
                value={values.successMessage}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Redirect URL (optional)</span>
              <input
                className={inputClass}
                onChange={(event) => {
                  setValues((current) => ({ ...current, redirectUrl: event.target.value }))
                }}
                placeholder="https://www.example.com/thanks"
                type="url"
                value={values.redirectUrl}
              />
              <span className="text-xs text-muted-foreground">
                Browser form POSTs receive a 303 redirect when set; API clients still receive JSON.
              </span>
            </label>
          </div>
        </div>

        <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Email alias (local part)</span>
            <input
              className={inputClass}
              onChange={(event) => {
                setValues((current) => ({ ...current, emailAlias: event.target.value.toLowerCase() }))
              }}
              placeholder="leads"
              value={values.emailAlias}
            />
            <span className="text-xs text-muted-foreground">
              Inbound mail is routed to this alias when your workspace mail domain is configured.
            </span>
          </label>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Server credentials</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {form.serverKeyCount} active key{form.serverKeyCount === 1 ? '' : 's'}. Keys are stored as hashes and
              shown only once.
            </p>
            <button
              className="mt-3 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
              disabled={rotating}
              onClick={() => void generateServerKey()}
              type="button"
            >
              {rotating ? 'Generating...' : 'Generate new server key'}
            </button>
            {generatedKey && (
              <p className="mt-2 break-all rounded bg-background p-2 font-mono text-xs" role="status">
                {generatedKey}
              </p>
            )}
            {keyResult?.ok === false && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {keyResult.error.message}
              </p>
            )}
          </div>
        </div>

        {resultMessage(result) && (
          <p
            className={`text-sm ${result?.ok === false ? 'text-destructive' : 'text-muted-foreground'}`}
            role={result?.ok === false ? 'alert' : 'status'}
          >
            {resultMessage(result)}
          </p>
        )}
        <button
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? 'Saving...' : 'Save intake settings'}
        </button>
      </form>

      <div className="grid gap-4 border-t pt-5">
        <div>
          <h3 className="font-medium">Integration snippets</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The endpoint accepts JSON and form-urlencoded POSTs. Browser callers must match an allowed origin and pass
            Turnstile when enabled.
          </p>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Embed form</span>
          <textarea
            aria-label="Embed form snippet"
            className={`${textAreaClass} min-h-40 font-mono text-xs`}
            readOnly
            value={embedSnippet}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Server request</span>
          <textarea
            aria-label="Server request snippet"
            className={`${textAreaClass} min-h-40 font-mono text-xs`}
            readOnly
            value={serverSnippet}
          />
        </label>
      </div>

      <div className="border-t pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h3 className="font-medium">Recent submissions</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Owners and managers can review the latest delivery status here.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Showing {form.submissions.length}</span>
        </div>
        {form.submissions.length === 0 ? (
          <p className="mt-3 rounded-lg border p-3 text-sm text-muted-foreground">No submissions recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border text-sm">
            {form.submissions.map((submission) => (
              <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" key={submission.id}>
                <span>{new Date(submission.receivedAt).toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  {submission.channel} · {submission.status.replaceAll('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
