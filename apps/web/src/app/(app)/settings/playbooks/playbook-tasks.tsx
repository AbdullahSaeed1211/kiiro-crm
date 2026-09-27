'use client'

import type { Playbook } from '@ops/module-work'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'

type Task = Playbook['tasks'][number]

/** The playbook's task rows: a title and an optional number of days after the win when it is due. */
export function PlaybookTasks({
  tasks,
  onChange,
}: Readonly<{ tasks: readonly Task[]; onChange: (tasks: Task[]) => void }>) {
  const replace = (index: number, next: Task) => {
    onChange(tasks.map((task, position) => (position === index ? next : task)))
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Tasks</p>
      {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : null}
      {tasks.map((task, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-center gap-2">
          <Input
            aria-label={`Task ${String(index + 1)} title`}
            value={task.title}
            maxLength={300}
            onChange={(event) => {
              replace(index, { ...task, title: event.target.value })
            }}
          />
          <Input
            aria-label={`Task ${String(index + 1)} due in days`}
            type="number"
            min={0}
            max={365}
            placeholder="Days"
            value={task.dueInDays ?? ''}
            onChange={(event) => {
              replace(index, { ...task, dueInDays: event.target.value === '' ? null : Number(event.target.value) })
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove task ${String(index + 1)}`}
            onClick={() => {
              onChange(tasks.filter((_, position) => position !== index))
            }}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onChange([...tasks, { title: '', dueInDays: null }])
        }}
      >
        Add task
      </Button>
    </div>
  )
}
