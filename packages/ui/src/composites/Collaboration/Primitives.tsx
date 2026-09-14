'use client'

import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../../components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Check, CircleAlert, Minus, SignalHigh, SignalLow, SignalMedium } from 'lucide-react'
import { useState } from 'react'

interface ViewOption {
  readonly id: string
  readonly label: string
  readonly kind?: string
  readonly pinned?: boolean
}

export function ViewSwitcher({
  views,
  selectedId,
  onSelect,
}: Readonly<{ views: readonly ViewOption[]; selectedId?: string; onSelect: (id: string) => void }>) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist">
      {views.map((view) => (
        <Button
          key={view.id}
          size="sm"
          variant={view.id === selectedId ? 'secondary' : 'ghost'}
          role="tab"
          aria-selected={view.id === selectedId}
          onClick={() => {
            onSelect(view.id)
          }}
        >
          {view.label}
        </Button>
      ))}
    </div>
  )
}

export function SavedViewMenu({
  views,
  selectedId,
  onSelect,
  labels = { trigger: 'Views' },
}: Readonly<{
  views: readonly ViewOption[]
  selectedId?: string
  onSelect: (id: string) => void
  labels?: Readonly<{ trigger: string }>
}>) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" variant="outline" />}>{labels.trigger}</PopoverTrigger>
      <PopoverContent className="w-56 p-1">
        <Command>
          <CommandInput placeholder="Search views" />
          <CommandList>
            <CommandEmpty>No views found.</CommandEmpty>
            {views.map((view) => (
              <CommandItem
                key={view.id}
                value={view.label}
                onSelect={() => {
                  setOpen(false)
                  onSelect(view.id)
                }}
              >
                {view.id === selectedId ? (
                  <Check aria-hidden className="mr-2 size-4" />
                ) : (
                  <span className="mr-2 size-4" />
                )}
                {view.label}
                {view.pinned ? (
                  <Badge className="ml-auto" variant="outline">
                    Pinned
                  </Badge>
                ) : null}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function BulkActionBar({
  selectedCount,
  actions,
  labels = { selected: 'selected' },
}: Readonly<{
  selectedCount: number
  actions: readonly { readonly id: string; readonly label: string; readonly onClick: () => void }[]
  labels?: Readonly<{ selected: string }>
}>) {
  if (selectedCount === 0) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background p-2 text-sm shadow-sm" role="toolbar">
      <span className="mr-2 text-muted-foreground">
        {String(selectedCount)} {labels.selected}
      </span>
      {actions.map((action) => (
        <Button
          key={action.id}
          size="sm"
          variant="outline"
          onClick={() => {
            action.onClick()
          }}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}

const PRIORITY_ICONS = {
  none: Minus,
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  urgent: CircleAlert,
} as const
export function PriorityIcon({ priority, label }: Readonly<{ priority: keyof typeof PRIORITY_ICONS; label?: string }>) {
  const Icon = PRIORITY_ICONS[priority]
  return <Icon aria-label={label ?? priority} className="size-4" />
}

export function UserAvatar({
  name,
  imageUrl,
  size = 'sm',
}: Readonly<{ name: string; imageUrl?: string; size?: 'sm' | 'default' }>) {
  return (
    <Avatar size={size}>
      <AvatarFallback>
        {name
          .trim()
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || '?'}
      </AvatarFallback>
      {imageUrl ? <img src={imageUrl} alt="" /> : null}
    </Avatar>
  )
}

export function AvatarStack({
  users,
  max = 3,
}: Readonly<{ users: readonly { readonly id: string; readonly name: string }[]; max?: number }>) {
  const visible = users.slice(0, max)
  const remainder = users.length - visible.length
  return (
    <div className="flex items-center -space-x-2" aria-label={`${String(users.length)} ${users.length === 1 ? 'user' : 'users'}`}>
      {visible.map((user) => (
        <UserAvatar key={user.id} name={user.name} />
      ))}
      {remainder > 0 ? (
        <Avatar size="sm">
          <AvatarFallback>+{String(remainder)}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  )
}
