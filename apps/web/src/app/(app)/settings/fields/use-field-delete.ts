import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ConfigAction, FieldDefinition } from './field-constants'

export function useFieldDelete(action: ConfigAction) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()

  const remove = async (field: FieldDefinition) => {
    if (!window.confirm(`Delete the “${field.label}” field?`)) return
    setPending(true)
    try {
      const result = await action({ collection: 'fieldDefinitions', id: field.id })
      setMessage(result.ok ? 'Field deleted.' : result.error.message)
      if (result.ok) router.refresh()
    } catch {
      setMessage('Could not delete this field. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return { pending, message, remove }
}
