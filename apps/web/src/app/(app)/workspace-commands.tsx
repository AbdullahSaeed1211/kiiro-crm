import { CommandGroup, CommandItem, CommandShortcut } from '@ops/ui/components/ui/command'
import { Keyboard, Link2, type LucideIcon } from 'lucide-react'
import { NEW_TASK_KEY } from './workspace-shortcuts'
import type { NavEntry } from './app-navigation'

type Copy = Readonly<Record<string, string>>
type CreateLink = Readonly<{ key: string; href: string; icon: LucideIcon }>

/** The keys that reach a command directly, shown beside it: "G T" to go to Tasks, "C" for a new task. */
function shortcutFor(href: string, shortcut?: string): string | undefined {
  if (href === '/tasks/new') return NEW_TASK_KEY.toUpperCase()
  return shortcut === undefined ? undefined : `G ${shortcut.toUpperCase()}`
}

const matcher = (query: string) => {
  const needle = query.trim().toLowerCase()
  return (label: string) => needle === '' || label.toLowerCase().includes(needle)
}

/** The palette's commands (go to, create, copy link), narrowed by whatever is typed; renders nothing when none match. */
export function WorkspaceCommands({
  query,
  copy,
  entries,
  creates: createLinks,
  onGo,
  onCopyLink,
  onShowShortcuts,
}: Readonly<{
  query: string
  copy: Copy
  entries: readonly NavEntry[]
  creates: readonly CreateLink[]
  onGo: (href: string) => void
  onCopyLink: () => void
  onShowShortcuts: () => void
}>) {
  const matches = matcher(query)
  const navigation = entries.filter((entry) => matches(entry.label))
  const creates = createLinks.filter(({ key }) => matches(copy[key]))
  const copyLink = copy.copyLink
  return (
    <>
      {navigation.length === 0 ? null : (
        <CommandGroup heading={copy.navigate}>
          {navigation.map(({ href, icon: Icon, label, shortcut }) => (
            <CommandItem
              key={href}
              value={label}
              onSelect={() => {
                onGo(href)
              }}
            >
              <Icon aria-hidden />
              <span>{label}</span>
              <CommandShortcut>{shortcutFor(href, shortcut)}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {creates.length === 0 ? null : (
        <CommandGroup heading={copy.create}>
          {creates.map(({ key, href, icon: Icon }) => (
            <CommandItem
              key={href}
              value={copy[key]}
              onSelect={() => {
                onGo(href)
              }}
            >
              <Icon aria-hidden />
              <span>{copy[key]}</span>
              <CommandShortcut>{shortcutFor(href)}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {matches(copyLink) || matches(copy.showShortcuts) ? (
        <CommandGroup heading={copy.actions}>
          {matches(copyLink) ? (
            <CommandItem value={copyLink} onSelect={onCopyLink}>
              <Link2 aria-hidden />
              <span>{copyLink}</span>
            </CommandItem>
          ) : null}
          {matches(copy.showShortcuts) ? (
            <CommandItem value={copy.showShortcuts} onSelect={onShowShortcuts}>
              <Keyboard aria-hidden />
              <span>{copy.showShortcuts}</span>
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          ) : null}
        </CommandGroup>
      ) : null}
    </>
  )
}
