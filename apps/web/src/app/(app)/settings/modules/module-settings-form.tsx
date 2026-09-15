'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ActionResult } from '../../../../server/actions/settings'

interface ModuleOption {
  id: 'crm' | 'work' | 'intake' | 'mail'
  label: string
  description: string
  dependency?: string
}
type ModuleAction = (input: unknown) => Promise<ActionResult>

const MODULES: readonly ModuleOption[] = [
  { id: 'crm', label: 'CRM', description: 'Leads, deals, contacts, organizations, and pipelines.' },
  { id: 'work', label: 'Work', description: 'Tasks, projects, calendar, and timeline.' },
  { id: 'intake', label: 'Intake', description: 'Public lead forms and secure submission review.' },
  {
    id: 'mail',
    label: 'Mail',
    description: 'Inbound record addressing and email notifications.',
    dependency: 'Requires an outbound sender to send system email.',
  },
]

export function ModuleSettingsForm({
  action,
  initialValues,
}: Readonly<{ action: ModuleAction; initialValues: Readonly<Record<string, boolean>> }>) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MODULES.map((module) => [module.id, initialValues[module.id] ?? true])),
  )
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const save = async () => {
    setPending(true)
    setMessage(undefined)
    try {
      const result = await action(values)
      setMessage(result.ok ? 'Modules saved.' : result.error)
      if (result.ok) router.refresh()
    } catch {
      setMessage('Unable to save modules. Try again.')
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-4">
      <div className="divide-y rounded-lg border">
        {MODULES.map((module) => (
          <label
            className="flex cursor-pointer items-start justify-between gap-4 p-4 hover:bg-muted/30"
            key={module.id}
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">{module.label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{module.description}</span>
              {module.dependency ? (
                <span className="mt-1 block text-xs text-muted-foreground">{module.dependency}</span>
              ) : null}
            </span>
            <input
              className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="checkbox"
              checked={values[module.id]}
              onChange={(event) => {
                setValues((current) => ({ ...current, [module.id]: event.target.checked }))
              }}
              disabled={pending}
              aria-label={`${module.label} module`}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          type="button"
          onClick={() => {
            void save()
          }}
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Save modules'}
        </button>
        {message ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
