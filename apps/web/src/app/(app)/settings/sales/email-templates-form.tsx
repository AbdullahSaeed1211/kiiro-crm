'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { SALES_SETTINGS_COPY } from '../../../../i18n/sales-settings-copy'
import { useState } from 'react'
import { saveEmailTemplates } from '../../../../server/actions/settings/sales'
import { useSave } from './use-save'

type Template = Readonly<{ id: string; name: string; subject: string; body: string }>

function TemplateEditor({
  template,
  onChange,
  onRemove,
}: Readonly<{ template: Template; onChange: (next: Template) => void; onRemove: () => void }>) {
  const copy = catalogFor(SALES_SETTINGS_COPY, useLocale()).templates
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <Input
        aria-label={copy.nameLabel}
        placeholder={copy.nameLabel}
        value={template.name}
        onChange={(event) => {
          onChange({ ...template, name: event.target.value })
        }}
      />
      <Input
        aria-label={copy.subjectLabel}
        placeholder={copy.subjectLabel}
        value={template.subject}
        onChange={(event) => {
          onChange({ ...template, subject: event.target.value })
        }}
      />
      <Textarea
        aria-label={copy.messageLabel}
        placeholder={copy.messagePlaceholder}
        className="min-h-28"
        value={template.body}
        onChange={(event) => {
          onChange({ ...template, body: event.target.value })
        }}
      />
      <Button variant="ghost" size="sm" className="w-fit" onClick={onRemove}>
        {copy.remove}
      </Button>
    </div>
  )
}

/** Reusable email subjects and messages; staff insert one from the email box on a lead or contact. */
export function EmailTemplatesForm({ initial }: Readonly<{ initial: readonly Template[] }>) {
  const copy = catalogFor(SALES_SETTINGS_COPY, useLocale()).templates
  const [templates, setTemplates] = useState<readonly Template[]>(initial)
  const { save, message, pending } = useSave(saveEmailTemplates)
  return (
    <div className="grid gap-3 text-sm">
      <h2 className="font-medium">{copy.title}</h2>
      <p className="text-muted-foreground">{copy.help}</p>
      {templates.map((template, index) => (
        <TemplateEditor
          key={template.id}
          template={template}
          onChange={(next) => {
            setTemplates(templates.map((entry, at) => (at === index ? next : entry)))
          }}
          onRemove={() => {
            setTemplates(templates.filter((_, at) => at !== index))
          }}
        />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTemplates([...templates, { id: crypto.randomUUID(), name: '', subject: '', body: '' }])
          }}
        >
          {copy.add}
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            save(templates)
          }}
        >
          {copy.save}
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
