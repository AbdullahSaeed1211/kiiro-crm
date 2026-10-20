import { CommandGroup, CommandItem } from '@ops/ui/components/ui/command'
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

type Copy = Readonly<Record<string, string>>

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
