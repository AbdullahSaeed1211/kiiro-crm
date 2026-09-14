'use client'

import { Button } from '../../components/ui/button'
import { Command, CommandInput, CommandList } from '../../components/ui/command'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import { Textarea } from '../../components/ui/textarea'
import { Bell } from 'lucide-react'
import type { ReactNode } from 'react'

function safeMarkup(source: string): string {
  return source
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('\n', '<br />')
}

export function CommentComposer({
  value,
  onChange,
  onSubmit,
  users = [],
  placeholder = 'Write a comment...',
}: Readonly<{
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  users?: readonly { readonly id: string; readonly name: string }[]
  placeholder?: string
}>) {
  return (
    <div className="grid gap-2">
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onSubmit()
          }}
          disabled={!value.trim()}
        >
          Comment
        </Button>
      </div>
      {users.length > 0 ? (
        <div className="text-xs text-muted-foreground">Type @[name](userId) to mention a teammate.</div>
      ) : null}
    </div>
  )
}

export function AttachmentList({
  files,
  onDownload,
}: Readonly<{
  files: readonly { readonly id: string; readonly fileName: string; readonly sizeBytes: number }[]
  onDownload: (id: string) => void
}>) {
  return (
    <ul className="divide-y rounded-lg border">
      {files.map((file) => (
        <li key={file.id} className="flex items-center justify-between gap-3 p-3 text-sm">
          <span className="truncate">
            {file.fileName}
            <span className="ml-2 text-xs text-muted-foreground">{String(Math.ceil(file.sizeBytes / 1024))} KB</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onDownload(file.id)
            }}
          >
            Download
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function NotificationBell({ unread, onOpen }: Readonly<{ unread: number; onOpen: () => void }>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={unread > 0 ? `${String(unread)} unread notifications` : 'Notifications'}
      onClick={() => {
        onOpen()
      }}
    >
      <Bell aria-hidden className="size-4" />
      {unread > 0 ? (
        <span className="absolute ml-4 mt-[-18px] rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
          {unread > 99 ? '99+' : String(unread)}
        </span>
      ) : null}
    </Button>
  )
}

export function CommandMenu({
  open,
  onOpenChange,
  children,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void; children?: ReactNode }>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top">
        <SheetHeader>
          <SheetTitle>Search workspace</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {children ?? (
            <Command>
              <CommandInput placeholder="Search" />
              <CommandList />
            </Command>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function MarkdownLite({ source }: Readonly<{ source: string }>) {
  return <div className="text-sm leading-6" dangerouslySetInnerHTML={{ __html: safeMarkup(source) }} />
}
