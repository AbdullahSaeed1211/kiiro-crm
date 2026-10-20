'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ops/ui/components/ui/dialog'
import type { ReactNode } from 'react'
import { SHORTCUTS_COPY } from '../../i18n/shortcuts-copy'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'

function Key({ children }: Readonly<{ children: ReactNode }>) {
  return <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-xs text-muted-foreground">{children}</kbd>
}

function Row({ keys, label }: Readonly<{ keys: readonly ReactNode[]; label: string }>) {
  return (
    <li className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((key, index) => (
          <Key key={index}>{key}</Key>
        ))}
      </span>
    </li>
  )
}

function Group({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="divide-y">{children}</ul>
    </section>
  )
}

/** Every keyboard shortcut in one place, opened with `?`. */
export function ShortcutsHelp({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const copy = catalogFor(SHORTCUTS_COPY, useLocale())
  const go = (key: string, label: string) => <Row key={key} keys={['G', key]} label={label} />
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          <Group title={copy.general}>
            <Row keys={['⌘/Ctrl', 'K']} label={copy.commandMenu} />
            <Row keys={['⌘/Ctrl', 'B']} label={copy.toggleSidebar} />
            <Row keys={['/']} label={copy.searchPage} />
            <Row keys={['?']} label={copy.showShortcuts} />
            <Row keys={['Esc']} label={copy.close} />
          </Group>
          <Group title={copy.create}>
            <Row keys={['N']} label={copy.newRecord} />
            <Row keys={['C']} label={copy.newTask} />
          </Group>
          <Group title={copy.goTo}>
            {go('D', copy.dashboard)}
            {go('M', copy.myTasks)}
            {go('T', copy.tasks)}
            {go('L', copy.leads)}
            {go('P', copy.projects)}
            {go('C', copy.calendar)}
          </Group>
        </div>
        <p className="text-xs text-muted-foreground">{copy.typingNote}</p>
      </DialogContent>
    </Dialog>
  )
}
