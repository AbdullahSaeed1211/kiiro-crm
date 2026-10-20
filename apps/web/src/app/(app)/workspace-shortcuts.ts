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

/** How long after `g` the next key still counts as the second half of a "go to" shortcut. */
const SEQUENCE_MS = 1200

function typingInto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

type Action = Readonly<{ kind: 'go'; href: string }> | Readonly<{ kind: 'search' }> | Readonly<{ kind: 'arm' }> | null

/** True when a key press is not for the shortcuts: a modifier is held, or the person is typing or in a dialog. */
function ignored(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return true
  return typingInto(event.target) || document.querySelector('[role="dialog"]') !== null
}

/** What a key does, given whether `g` was just pressed. */
function actionFor(key: string, armed: boolean): Action {
  if (armed) {
    const href = GO_KEYS[key]
    return href === undefined ? null : { kind: 'go', href }
  }
  if (key === '/') return { kind: 'search' }
  if (key === NEW_TASK_KEY) return { kind: 'go', href: '/tasks/new' }
  return key === 'g' ? { kind: 'arm' } : null
}

/**
 * Single-key shortcuts for the whole workspace: `/` opens search, `c` starts a new task and `g` then a letter goes to a
 * section. They stay quiet while typing, while a dialog or panel is open, and with any modifier held.
 */
export function useWorkspaceShortcuts({
  openSearch,
  go,
}: Readonly<{ openSearch: () => void; go: (href: string) => void }>) {
  useEffect(() => {
    let armedUntil = 0
    const onKeyDown = (event: KeyboardEvent) => {
      if (ignored(event)) return
      const action = actionFor(event.key.toLowerCase(), Date.now() < armedUntil)
      armedUntil = action?.kind === 'arm' ? Date.now() + SEQUENCE_MS : 0
      if (action === null || action.kind === 'arm') return
      event.preventDefault()
      if (action.kind === 'go') go(action.href)
      else openSearch()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openSearch, go])
}
