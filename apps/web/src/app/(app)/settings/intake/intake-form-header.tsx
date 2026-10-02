'use client'
import { Button } from '@ops/ui/components/ui/button'

type ActionResult = { ok: boolean; error?: { message: string } } | undefined

function getResultMessage(result: ActionResult): string | undefined {
  if (result?.ok === false) {
    return result.error?.message
  }
  if (result?.ok === true) {
    return 'Saved.'
  }
  return undefined
}

export function HeaderSection({
  name,
  endpoint,
  active,
}: Readonly<{ name: string; endpoint: string; active: boolean }>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-medium">{name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Public endpoint: <code>{endpoint}</code>
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}
      >
        {active ? 'Active' : 'Paused'}
      </span>
    </div>
  )
}

export function ResultMessage({ result }: Readonly<{ result: ActionResult }>) {
  const message = getResultMessage(result)
  if (!message) return null

  const isError = result?.ok === false
  return (
    <p
      className={`text-sm ${isError ? 'text-destructive' : 'text-muted-foreground'}`}
      role={isError ? 'alert' : 'status'}
    >
      {message}
    </p>
  )
}

export function SubmitButton({ pending }: Readonly<{ pending: boolean }>) {
  return (
    <Button size="lg" disabled={pending} type="submit">
      {pending ? 'Saving...' : 'Save intake settings'}
    </Button>
  )
}
