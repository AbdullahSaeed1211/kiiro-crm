'use client'

import { useEffect } from 'react'

/** Press `g`, then one of these keys, to jump to a section. */
export const GO_KEYS: Readonly<Partial<Record<string, string>>> = {
  d: '/',
  m: '/my-tasks',
  t: '/tasks',
  l: '/leads',
  p: '/projects',
  c: '/calendar',
}

/** Press this key on its own to start a new task. */
export const NEW_TASK_KEY = 'c'

/** The list pages where `n` starts a new record, and where that record is made. */
const NEW_RECORD_PATHS: Readonly<Partial<Record<string, string>>> = {
  tasks: '/tasks/new',
  leads: '/leads/new',
  contacts: '/contacts/new',
  organizations: '/organizations/new',
  projects: '/projects/new',
}

/** How long after `g` the next key still counts as the second half of a "go to" shortcut. */
const SEQUENCE_MS = 1200

function typingInto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

type Action =
  | Readonly<{ kind: 'go'; href: string }>
  | Readonly<{ kind: 'search' }>
  | Readonly<{ kind: 'help' }>
  | Readonly<{ kind: 'arm' }>
  | null

/** True when a key press is not for the shortcuts: a modifier is held, or the person is typing or in a dialog. */
function ignored(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return true
  return typingInto(event.target) || document.querySelector('[role="dialog"]') !== null
}

/** The new-record page for the list the person is on, when that list has one. */
function newRecordHref(): string | undefined {
  return NEW_RECORD_PATHS[window.location.pathname.split('/')[1] ?? '']
}

const SIMPLE_KEYS: Readonly<Partial<Record<string, Action>>> = {
  '/': { kind: 'search' },
  '?': { kind: 'help' },
  g: { kind: 'arm' },
  [NEW_TASK_KEY]: { kind: 'go', href: '/tasks/new' },
}

/** What a key does, given whether `g` was just pressed. */
function actionFor(key: string, armed: boolean): Action {
  if (armed) {
    const href = GO_KEYS[key]
    return href === undefined ? null : { kind: 'go', href }
  }
  if (key === 'n') {
    const href = newRecordHref()
    return href === undefined ? null : { kind: 'go', href }
  }
  return SIMPLE_KEYS[key] ?? null
}

/** Moves the cursor into the page's own search box; false when the page has none on screen. */
function focusPageSearch(): boolean {
  const boxes = document.querySelectorAll<HTMLInputElement>(
    'main input[type="search"], main input[placeholder*="Search" i]',
  )
  const box = [...boxes].find((candidate) => candidate.offsetParent !== null)
  if (box === undefined) return false
  box.focus()
  box.select()
  return true
}

/**
 * Single-key shortcuts for the whole workspace: `/` searches the page (or opens the command menu when the page has no
 * search), `n` starts a new record on a list page, `?` lists the shortcuts, `c` starts a new task and `g` then a letter
 * goes to a section. They stay quiet while typing, while a dialog or panel is open, and with any modifier held.
 */
export function useWorkspaceShortcuts({
  openSearch,
  openHelp,
  go,
}: Readonly<{ openSearch: () => void; openHelp: () => void; go: (href: string) => void }>) {
  const openSearchOrFocus = () => {
    if (!focusPageSearch()) openSearch()
  }
  useEffect(() => {
    let armedUntil = 0
    const onKeyDown = (event: KeyboardEvent) => {
      if (ignored(event)) return
      const action = actionFor(event.key.toLowerCase(), Date.now() < armedUntil)
      armedUntil = action?.kind === 'arm' ? Date.now() + SEQUENCE_MS : 0
      if (action === null || action.kind === 'arm') return
      event.preventDefault()
      if (action.kind === 'go') go(action.href)
      else if (action.kind === 'help') openHelp()
      else openSearchOrFocus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openSearch, openHelp, go])
}
