'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { useEffect, useState } from 'react'
import { applyEmailTemplate, listEmailTemplates } from '../../server/actions/email-templates'

/** A dropdown in the email box that fills the subject and message from a saved template; hidden when there are none. */
export function EmailTemplatePicker({
  recordType,
  recordId,
  disabled,
  onPick,
}: Readonly<{
  recordType: string
  recordId: string
  disabled: boolean
  onPick: (filled: { subject: string; body: string }) => void
}>) {
  const [templates, setTemplates] = useState<readonly { id: string; name: string }[]>([])
  useEffect(() => {
    void listEmailTemplates().then(setTemplates)
  }, [])
  if (templates.length === 0) return null
  return (
    <NativeSelect
      size="sm"
      aria-label="Insert template"
      disabled={disabled}
      value=""
      onChange={(event) => {
        const id = event.target.value
        if (id === '') return
        void applyEmailTemplate({ id, recordType, recordId }).then((result) => {
          if (result.ok) onPick(result.data)
        })
      }}
    >
      <option value="">Insert template…</option>
      {templates.map((template) => (
        <option key={template.id} value={template.id}>
          {template.name}
        </option>
      ))}
    </NativeSelect>
  )
}
