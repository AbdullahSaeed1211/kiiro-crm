'use client'

import type { VoiceSnapshot } from '@ops/module-crm'
import { Checkbox } from '@ops/ui/components/ui/checkbox'

export function AssigneeList({
  members,
  selected,
  onChange,
}: Readonly<{
  members: VoiceSnapshot['members']
  selected: readonly string[]
  onChange: (input: { memberId: string; operation: 'add' | 'remove' }) => void
}>) {
  return (
    <div className="space-y-1.5">
      {members.map((member) => (
        <label key={member.id} className="flex items-center gap-2 text-xs">
          <Checkbox
            checked={selected.includes(member.id)}
            onCheckedChange={(checked) => {
              onChange({ memberId: member.id, operation: checked ? 'add' : 'remove' })
            }}
          />
          {member.name}
        </label>
      ))}
    </div>
  )
}
