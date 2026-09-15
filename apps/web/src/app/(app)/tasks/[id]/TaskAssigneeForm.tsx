/* eslint-disable @typescript-eslint/no-confusing-void-expression -- assignment save is an explicit non-blocking action. */
'use client'

import { updateTask } from '../../../../server/actions/work/tasks/updateTask'
import { useState } from 'react'

export function TaskAssigneeForm({
  taskId,
  expectedUpdatedAt,
  selected,
  people,
}: Readonly<{
  taskId: string
  expectedUpdatedAt: number
  selected: readonly string[]
  people: readonly [string, string][]
}>) {
  const [assignees, setAssignees] = useState([...selected])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (saving) return
    setSaving(true)
    const result = await updateTask({ taskId, expectedUpdatedAt, patch: { assigneeIds: assignees } })
    setMessage(result.ok ? 'Assignments saved.' : result.error.message)
    setSaving(false)
  }
  return (
    <section className="space-y-2 border-t pt-4">
      <h2 className="text-sm font-medium">Assignees</h2>
      <select
        aria-label="Task assignees"
        className="min-h-24 w-full border p-2 text-sm"
        multiple
        value={assignees}
        onChange={(event) => setAssignees([...event.target.selectedOptions].map((option) => option.value))}
      >
        {people.map(([id, name]) => (
          <option key={id} value={id}>
            {name || 'Unavailable member'}
          </option>
        ))}
      </select>
      <button className="h-9 border px-3 text-sm" type="button" onClick={() => void save()} disabled={saving}>
        {saving ? 'Saving…' : 'Save assignments'}
      </button>
      <p className="text-xs text-muted-foreground" role="status">
        {message}
      </p>
    </section>
  )
}
