'use client'

import type { Playbook } from '@ops/module-work'
import { Button } from '@ops/ui/components/ui/button'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ActionResult } from '../../../../server/action-result'
import { PlaybookTasks } from './playbook-tasks'

const newPlaybook = (): Playbook => ({ id: crypto.randomUUID(), name: '', onDealWon: false, tasks: [] })

function PlaybookCard({
  playbook,
  onChange,
  onRemove,
}: Readonly<{ playbook: Playbook; onChange: (next: Playbook) => void; onRemove: () => void }>) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-48 flex-1 gap-1 text-xs">
          <span className="font-medium">Name</span>
          <Input
            value={playbook.name}
            maxLength={120}
            onChange={(event) => {
              onChange({ ...playbook, name: event.target.value })
            }}
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={playbook.onDealWon}
            onCheckedChange={(checked) => {
              onChange({ ...playbook, onDealWon: checked })
            }}
          />
          Run when a deal is won
        </label>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={onRemove}>
          Remove playbook
        </Button>
      </div>
      <PlaybookTasks
        tasks={playbook.tasks}
        onChange={(tasks) => {
          onChange({ ...playbook, tasks })
        }}
      />
    </div>
  )
}

/** Edits every playbook together and saves them in one request; only one can run on won deals. */
export function PlaybookEditor({
  initial,
  action,
}: Readonly<{ initial: readonly Playbook[]; action: (input: unknown) => Promise<ActionResult> }>) {
  const router = useRouter()
  const [playbooks, setPlaybooks] = useState<Playbook[]>([...initial])
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const update = (index: number, next: Playbook) => {
    setPlaybooks((current) =>
      current.map((item, position) =>
        position === index ? next : { ...item, onDealWon: next.onDealWon ? false : item.onDealWon },
      ),
    )
  }
  const remove = (id: string) => {
    setPlaybooks((current) => current.filter((item) => item.id !== id))
  }
  const save = async () => {
    setPending(true)
    const result = await action(playbooks)
    setPending(false)
    setMessage(result.ok ? 'Playbooks saved.' : result.error.message)
    if (result.ok) router.refresh()
  }
  return (
    <div className="space-y-4">
      {playbooks.map((playbook, index) => (
        <PlaybookCard
          key={playbook.id}
          playbook={playbook}
          onChange={(next) => {
            update(index, next)
          }}
          onRemove={() => {
            remove(playbook.id)
          }}
        />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setPlaybooks((current) => [...current, newPlaybook()])
          }}
        >
          Add playbook
        </Button>
        <Button disabled={pending} onClick={() => void save()}>
          {pending ? 'Saving…' : 'Save playbooks'}
        </Button>
        {message === null ? null : (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
