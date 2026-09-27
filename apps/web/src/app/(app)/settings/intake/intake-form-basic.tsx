'use client'

const inputClass = 'h-10 rounded-md border bg-background px-3 text-sm'

export function BasicSettingsSection({
  values,
  onNameChange,
  onKeyChange,
  onActiveChange,
}: Readonly<{
  values: { name: string; key: string; active: boolean }
  onNameChange: (value: string) => void
  onKeyChange: (value: string) => void
  onActiveChange: (checked: boolean) => void
}>) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Form name</span>
          <input
            className={inputClass}
            onChange={(event) => {
              onNameChange(event.target.value)
            }}
            value={values.name}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Public key</span>
          <input
            className={inputClass}
            onChange={(event) => {
              onKeyChange(event.target.value.toLowerCase())
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
            onActiveChange(event.target.checked)
          }}
          type="checkbox"
        />
        <span>
          <span className="font-medium">Accept submissions</span>
          <span className="block text-xs text-muted-foreground">Pause the endpoint without deleting the form.</span>
        </span>
      </label>
    </>
  )
}

const textAreaClass = 'min-h-24 rounded-md border bg-background px-3 py-2 text-sm'

export function OriginsAndTurnstileSection({
  allowedOrigins,
  requireTurnstile,
  onOriginsChange,
  onTurnstileChange,
}: Readonly<{
  allowedOrigins: string
  requireTurnstile: boolean
  onOriginsChange: (value: string) => void
  onTurnstileChange: (checked: boolean) => void
}>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span className="font-medium">Allowed browser origins</span>
        <textarea
          className={textAreaClass}
          onChange={(event) => {
            onOriginsChange(event.target.value)
          }}
          placeholder="https://www.example.com"
          value={allowedOrigins}
        />
        <span className="text-xs text-muted-foreground">
          One exact http(s) origin per line. Wildcards and paths are rejected.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input
          checked={requireTurnstile}
          className="mt-1"
          onChange={(event) => {
            onTurnstileChange(event.target.checked)
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
  )
}
