'use client'

import type { IntakeFormView, IntakeSubmissionView } from './intake-types'

const inputClass = 'h-10 rounded-md border bg-background px-3 text-sm'
const textAreaClass = 'min-h-24 rounded-md border bg-background px-3 py-2 text-sm'

export function EmailAliasAndCredentialsSection({
  form,
  emailAlias,
  generatedKey,
  keyResult,
  rotating,
  onEmailAliasChange,
  onGenerateKey,
}: Readonly<{
  form: IntakeFormView
  emailAlias: string
  generatedKey: string | undefined
  keyResult: { ok: boolean; error?: { message: string } } | undefined
  rotating: boolean
  onEmailAliasChange: (value: string) => void
  onGenerateKey: () => void
}>) {
  return (
    <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Email alias (local part)</span>
        <input
          className={inputClass}
          onChange={(event) => {
            onEmailAliasChange(event.target.value.toLowerCase())
          }}
          placeholder="leads"
          value={emailAlias}
        />
        <span className="text-xs text-muted-foreground">
          Inbound mail is routed to this alias when your workspace mail domain is configured.
        </span>
      </label>
      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Server credentials</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {form.serverKeyCount} active key{form.serverKeyCount === 1 ? '' : 's'}. Keys are stored as hashes and shown
          only once.
        </p>
        <button
          className="mt-3 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
          disabled={rotating}
          onClick={onGenerateKey}
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
            {keyResult.error?.message}
          </p>
        )}
      </div>
    </div>
  )
}

export function IntegrationSnippetsSection({
  embedSnippet,
  serverSnippet,
}: Readonly<{
  embedSnippet: string
  serverSnippet: string
}>) {
  return (
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
  )
}

export function SubmissionsSection({ form }: Readonly<{ form: IntakeFormView }>) {
  return (
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
        <SubmissionsList submissions={form.submissions} />
      )}
    </div>
  )
}

function SubmissionsList({ submissions }: Readonly<{ submissions: readonly IntakeSubmissionView[] }>) {
  return (
    <ul className="mt-3 divide-y rounded-lg border text-sm">
      {submissions.map((submission) => (
        <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" key={submission.id}>
          <span>{new Date(submission.receivedAt).toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">
            {submission.channel} · {submission.status.replaceAll('_', ' ')}
          </span>
        </li>
      ))}
    </ul>
  )
}
