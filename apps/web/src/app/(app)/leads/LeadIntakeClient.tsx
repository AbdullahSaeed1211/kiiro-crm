'use client'

import { useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { LEAD_INTAKE_COPY } from '../../../i18n/lead-intake-copy'
import type { Locale } from '../../../i18n/config'

type HostedForm = Readonly<{ id: string; name: string; key: string }>

export function LeadIntakeClient({ forms, locale }: Readonly<{ forms: readonly HostedForm[]; locale: Locale }>) {
  const copy = LEAD_INTAKE_COPY[locale]
  const [selectedKey, setSelectedKey] = useState(forms[0]?.key)
  const selected = forms.find((form) => form.key === selectedKey)
  if (forms.length === 0)
    return <p className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">{copy.empty}</p>
  return (
    <div className="grid gap-4">
      {forms.length > 1 ? (
        <div className="flex flex-wrap gap-2" aria-label={copy.chooseForm}>
          {forms.map((form) => (
            <Button
              key={form.id}
              type="button"
              variant={selected?.id === form.id ? 'default' : 'outline'}
              aria-pressed={selected?.id === form.id}
              onClick={() => {
                setSelectedKey(form.key)
              }}
            >
              {form.name}
            </Button>
          ))}
        </div>
      ) : null}
      {selected === undefined ? null : (
        <iframe
          key={selected.key}
          title={`${copy.embeddedForm}: ${selected.name}`}
          src={`/forms/${encodeURIComponent(selected.key)}`}
          className="h-[min(74vh,58rem)] min-h-[36rem] w-full rounded-xl border bg-background"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  )
}
