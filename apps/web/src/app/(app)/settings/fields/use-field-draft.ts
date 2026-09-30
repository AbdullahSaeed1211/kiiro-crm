import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ConfigAction, FieldDefinition } from './field-constants'

function buildPayload(draft: FieldDefinition) {
  return {
    collection: 'fieldDefinitions',
    ...(draft.id ? { id: draft.id } : {}),
    recordType: draft.recordType,
    key: draft.key.trim(),
    label: draft.label.trim(),
    type: draft.type,
    required: draft.required,
    options: draft.options,
    visibility: draft.visibility,
    sensitive: draft.sensitive,
    hidden: draft.hidden,
    position: draft.position,
  }
}

export function useFieldDraft(initialValue: FieldDefinition, action: ConfigAction) {
  const router = useRouter()
  const [draft, setDraft] = useState(initialValue)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()

  const save = async (isNew?: boolean) => {
    if (!draft.key.trim() || !draft.label.trim()) {
      setMessage('Field key and label are required.')
      return false
    }
    setPending(true)
    setMessage(undefined)
    try {
      const result = await action(buildPayload(draft))
      if (result.ok) {
        setMessage(isNew ? 'Field created.' : 'Field saved.')
        router.refresh()
      } else {
        setMessage(result.error.message)
      }
      return result.ok
    } catch {
      setMessage('Unable to save field. Try again.')
      return false
    } finally {
      setPending(false)
    }
  }

  return { draft, setDraft, pending, message, save }
}
