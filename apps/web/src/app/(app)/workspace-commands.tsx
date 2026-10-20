import { CommandGroup, CommandItem, CommandShortcut } from '@ops/ui/components/ui/command'
import {
  Building2,
  CalendarDays,
  CircleCheckBig,
  Contact,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  Link2,
  ListTodo,
  UserPlus,
} from 'lucide-react'
import { GO_KEYS, NEW_TASK_KEY } from './workspace-shortcuts'

type Copy = Readonly<Record<string, string>>

/** The keys that reach a command directly, shown beside it: "G T" to go to Tasks, "C" for a new task. */
function shortcutFor(href: string): string | undefined {
  if (href === '/tasks/new') return NEW_TASK_KEY.toUpperCase()
  const key = Object.keys(GO_KEYS).find((candidate) => GO_KEYS[candidate] === href)
  return key === undefined ? undefined : `G ${key.toUpperCase()}`
}

const NAVIGATION = [
  ['dashboard', '/', LayoutDashboard],
  ['myTasks', '/my-tasks', CircleCheckBig],
  ['leads', '/leads', UserPlus],
  ['deals', '/deals', Handshake],
  ['projects', '/projects', FolderKanban],
  ['tasks', '/tasks', ListTodo],
  ['calendar', '/calendar', CalendarDays],
  ['contacts', '/contacts', Contact],
  ['organizations', '/organizations', Building2],
] as const
const CREATE = [
  ['newTask', '/tasks/new', ListTodo],
  ['newProject', '/projects/new', FolderKanban],
  ['newLead', '/leads/new', UserPlus],
  ['newContact', '/contacts/new', Contact],
  ['newOrganization', '/organizations/new', Building2],
] as const

const matcher = (query: string) => {
  const needle = query.trim().toLowerCase()
  return (label: string) => needle === '' || label.toLowerCase().includes(needle)
}

/** The palette's commands (go to, create, copy link), narrowed by whatever is typed; renders nothing when none match. */
export function WorkspaceCommands({
  query,
  copy,
  shellCopy,
  onGo,
  onCopyLink,
}: Readonly<{
  query: string
  copy: Copy
  shellCopy: Copy
  onGo: (href: string) => void
  onCopyLink: () => void
}>) {
  const matches = matcher(query)
  const navigation = NAVIGATION.filter(([key]) => matches(shellCopy[key]))
  const creates = CREATE.filter(([key]) => matches(copy[key]))
  const copyLink = copy.copyLink
  return (
    <>
      {navigation.length === 0 ? null : (
        <CommandGroup heading={copy.navigate}>
          {navigation.map(([key, href, Icon]) => (
            <CommandItem
              key={href}
              value={shellCopy[key]}
              onSelect={() => {
                onGo(href)
              }}
            >
              <Icon aria-hidden />
              <span>{shellCopy[key]}</span>
              <CommandShortcut>{shortcutFor(href)}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {creates.length === 0 ? null : (
        <CommandGroup heading={copy.create}>
          {creates.map(([key, href, Icon]) => (
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
      {matches(copyLink) ? (
        <CommandGroup heading={copy.actions}>
          <CommandItem value={copyLink} onSelect={onCopyLink}>
            <Link2 aria-hidden />
            <span>{copyLink}</span>
          </CommandItem>
        </CommandGroup>
      ) : null}
    </>
  )
}
