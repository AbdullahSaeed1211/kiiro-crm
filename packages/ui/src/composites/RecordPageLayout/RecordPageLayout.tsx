'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ops/ui/components/ui/tabs'
import { cn } from '@ops/ui/lib/utils'

export interface RecordPageTab {
  readonly id: string
  readonly label: string
  readonly content: ReactNode
  readonly disabled?: boolean
}

export type RecordPageLayoutLabels = Readonly<{
  breadcrumb: string
  saveTitle: string
  cancelTitle: string
}>

export type RecordPageLayoutProps = Readonly<{
  breadcrumbs?: ReactNode
  labels: RecordPageLayoutLabels
  title: string
  titleLabel?: string | undefined
  onTitleChange?: ((title: string) => void) | undefined
  stage?: ReactNode
  owner?: ReactNode
  actions?: ReactNode
  tabs: readonly RecordPageTab[]
  aside?: ReactNode
  defaultTab?: string
  className?: string | undefined
}>

function RecordTitle({
  title,
  titleLabel,
  onTitleChange,
  labels,
}: Readonly<{
  title: string
  titleLabel?: string | undefined
  onTitleChange?: ((title: string) => void) | undefined
  labels: RecordPageLayoutLabels
}>) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  if (onTitleChange === undefined) return <h1 className="truncate text-2xl font-semibold">{title}</h1>
  if (!editing) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-auto max-w-full justify-start px-1 text-left text-2xl font-semibold"
        aria-label={titleLabel}
        onClick={() => {
          setDraft(title)
          setEditing(true)
        }}
      >
        <span className="truncate">{title}</span>
      </Button>
    )
  }
  return (
    <form
      className="flex min-w-0 flex-1 gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const next = draft.trim()
        if (next.length > 0) {
          onTitleChange(next)
        }
        setEditing(false)
      }}
      onReset={() => {
        setEditing(false)
      }}
    >
      <Input
        autoFocus
        aria-label={titleLabel}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
      />
      <Button type="submit" size="sm" aria-label={labels.saveTitle}>
        ✓
      </Button>
      <Button type="reset" variant="ghost" size="sm" aria-label={labels.cancelTitle}>
        ×
      </Button>
    </form>
  )
}

/** Shared record detail shell. Slots are rendered as supplied and never fetch data. */
export function RecordPageLayout({
  breadcrumbs,
  labels,
  title,
  titleLabel,
  onTitleChange,
  stage,
  owner,
  actions,
  tabs,
  aside,
  defaultTab,
  className,
}: RecordPageLayoutProps) {
  const initialTab = defaultTab ?? tabs[0]?.id
  return (
    <div className={cn('flex min-h-0 flex-col gap-4', className)}>
      {breadcrumbs === undefined ? null : <nav aria-label={labels.breadcrumb}>{breadcrumbs}</nav>}
      <header className="flex flex-wrap items-center gap-2 border-b pb-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <RecordTitle title={title} titleLabel={titleLabel} onTitleChange={onTitleChange} labels={labels} />
          {stage}
          {owner}
        </div>
        {actions === undefined ? null : <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <Tabs defaultValue={initialTab} className="min-h-0">
        <TabsList variant="line">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} disabled={tab.disabled}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4">
                {tab.content}
              </TabsContent>
            ))}
          </div>
          {aside === undefined ? null : <aside className="min-w-0">{aside}</aside>}
        </div>
      </Tabs>
    </div>
  )
}
