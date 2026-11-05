'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ActionResult } from '../../../../server/actions/settings'
import { SaveBar } from '../save-bar'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { MODULES_COPY } from '../../../../i18n/modules-copy'

type ModuleId = 'crm' | 'work' | 'intake' | 'mail'
type ModuleAction = (input: unknown) => Promise<ActionResult>

const MODULE_IDS: readonly ModuleId[] = ['crm', 'work', 'intake', 'mail']

export function ModuleSettingsForm({
  action,
  initialValues,
}: Readonly<{ action: ModuleAction; initialValues: Readonly<Record<string, boolean>> }>) {
  const router = useRouter()
  const copy = catalogFor(MODULES_COPY, useLocale())
  const [values, setValues] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MODULE_IDS.map((id) => [id, initialValues[id] ?? true])),
  )
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const save = async () => {
    setPending(true)
    setMessage(undefined)
    try {
      const result = await action(values)
      setMessage(result.ok ? copy.saved : result.error.message)
      if (result.ok) router.refresh()
    } catch {
      setMessage(copy.failed)
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-4">
      <div className="divide-y rounded-lg border">
        {MODULE_IDS.map((id) => {
          const module = copy.modules[id]
          return (
            <label className="flex cursor-pointer items-start justify-between gap-4 p-4 hover:bg-muted/30" key={id}>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{module.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{module.description}</span>
                {'dependency' in module ? (
                  <span className="mt-1 block text-xs text-muted-foreground">{module.dependency}</span>
                ) : null}
              </span>
              <input
                className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="checkbox"
                checked={values[id]}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [id]: event.target.checked }))
                }}
                disabled={pending}
                aria-label={copy.moduleAria.replace('{name}', module.label)}
              />
            </label>
          )
        })}
      </div>
      <SaveBar
        pending={pending}
        label={copy.save}
        pendingLabel={copy.saving}
        message={message}
        onSave={() => {
          void save()
        }}
      />
    </div>
  )
}
