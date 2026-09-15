'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@ops/ui/components/ui/command'
import {
  Building2,
  CircleCheckBig,
  Contact,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  ListTodo,
  Search,
  UserPlus,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { taskHref } from './task-navigation'
import { useEffect, useState } from 'react'
import { SEARCH_COPY, SHELL_COPY, type Locale } from '../../i18n/config'

interface SearchResult {
  readonly recordType: string
  readonly id: string
  readonly title: string
  readonly subtitle: string
}

const SEARCH_ROUTES: Readonly<Partial<Record<string, string>>> = {
  organization: 'organizations',
  contact: 'contacts',
  lead: 'leads',
  deal: 'deals',
  project: 'projects',
  task: 'tasks',
}

const ICONS = {
  organization: Building2,
  contact: Contact,
  lead: UserPlus,
  deal: Handshake,
  project: FolderKanban,
  task: ListTodo,
}

function iconFor(recordType: string) {
  return recordType in ICONS ? ICONS[recordType as keyof typeof ICONS] : Search
}

function emptyCopy({ query, loading, copy }: Readonly<{ query: string; loading: boolean; copy: Readonly<Record<string, string>> }>): string {
  if (loading) return copy.searching
  if (query.length < 2) return copy.minChars
  return copy.noMatches
}

const NAVIGATION = [
  ['dashboard', '/', LayoutDashboard],
  ['myTasks', '/my-tasks', CircleCheckBig],
  ['leads', '/leads', UserPlus],
  ['deals', '/deals', Handshake],
  ['projects', '/projects', FolderKanban],
  ['tasks', '/tasks', ListTodo],
] as const
const CREATE = [
  ['newLead', '/leads/new', UserPlus],
  ['newContact', '/contacts/new', Contact],
  ['newOrganization', '/organizations/new', Building2],
] as const

// eslint-disable-next-line max-lines-per-function -- search owns keyboard, query, result, and navigation states.
export function WorkspaceSearch({ locale }: Readonly<{ locale: Locale }>) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<readonly SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const copy = SEARCH_COPY[locale]
  const shellCopy = SHELL_COPY[locale]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data) => {
          const payload = data as { results?: readonly SearchResult[] }
          setResults(payload.results ?? [])
        })
        .catch(() => {
          if (!controller.signal.aborted) setResults([])
        })
        .finally(() => {
          setLoading(false)
        })
    }, 180)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const visit = (result: SearchResult) => {
    const route = SEARCH_ROUTES[result.recordType]
    if (route === undefined) return
    setOpen(false)
    setQuery('')
    router.push(result.recordType === 'task' ? taskHref(result.id, pathname) : `/${route}/${result.id}`)
  }

  const visitPath = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <>
      <Button
        aria-label={copy.button}
        className="ops-search-trigger"
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Search aria-hidden />
        <span className="hidden lg:inline">{copy.button}</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setQuery('')
        }}
        title={copy.title}
        description={copy.description}
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder={copy.placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty aria-live="polite">{emptyCopy({ query, loading, copy })}</CommandEmpty>
            {query.trim().length < 2 ? (
              <>
                <CommandGroup heading={copy.navigate}>
                  {NAVIGATION.map(([key, href, Icon]) => (
                    <CommandItem
                      key={href}
                      value={shellCopy[key]}
                      onSelect={() => {
                        visitPath(href)
                      }}
                    >
                      <Icon aria-hidden />
                      <span>{shellCopy[key]}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading={copy.create}>
                  {CREATE.map(([key, href, Icon]) => (
                    <CommandItem
                      key={href}
                      value={copy[key]}
                      onSelect={() => {
                        visitPath(href)
                      }}
                    >
                      <Icon aria-hidden />
                      <span>{copy[key]}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
            <CommandGroup heading={results.length > 0 ? copy.records : undefined}>
              {results.map((result) => {
                const Icon = iconFor(result.recordType)
                return (
                  <CommandItem
                    key={`${result.recordType}:${result.id}`}
                    value={`${result.recordType}:${result.id}`}
                    onSelect={() => {
                      visit(result)
                    }}
                  >
                    <Icon aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{result.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.subtitle || result.recordType}
                      </span>
                    </span>
                    <CommandShortcut>{copy.enter}</CommandShortcut>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
