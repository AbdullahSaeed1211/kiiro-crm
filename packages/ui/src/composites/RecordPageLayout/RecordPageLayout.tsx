'use client'

import { Check, X } from 'lucide-react'
import { useRef, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  /**
   * The page builds only the open tab's content. A tab click then asks the server for the next tab, and the page stays
   * dimmed until it arrives. Without it every tab's content is already on the page and a click only changes the address.
   */
  serverTabs?: boolean
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
      <h1 className="min-w-0 max-w-full">
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
      </h1>
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
        aria-label={titleLabel}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
      />
      <Button type="submit" size="sm" aria-label={labels.saveTitle}>
        <Check aria-hidden />
      </Button>
      <Button type="reset" variant="ghost" size="sm" aria-label={labels.cancelTitle}>
        <X aria-hidden />
      </Button>
    </form>
  )
}

/** Which tab is open (from the address), and how a click changes it: in the browser, or by asking the server. */
function useRecordTabs({
  tabs,
  defaultTab,
  serverTabs,
}: Readonly<{ tabs: readonly RecordPageTab[]; defaultTab: string | undefined; serverTabs: boolean }>) {
  const pathname = usePathname()
  const router = useRouter()
  const [switching, startSwitch] = useTransition()
  const searchParams = useSearchParams()
  const fallbackTab = defaultTab ?? tabs[0]?.id
  const requestedTab = searchParams.get('tab')
  const activeTab = requestedTab !== null && tabs.some((tab) => tab.id === requestedTab) ? requestedTab : fallbackTab
  const hrefFor = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    return `${pathname}?${params.toString()}`
  }
  const prefetched = useRef(new Set<string>())
  /** Server tabs: fetch a tab's page when the pointer or focus reaches it, so the click finds it ready. */
  const prefetchTab = (value: string) => {
    const href = hrefFor(value)
    if (!serverTabs || value === activeTab || prefetched.current.has(href)) return
    prefetched.current.add(href)
    // 'full' fetches the dynamic page data too; the enum is not exported for client use, its value is this string.
    router.prefetch(href, { kind: 'full' as never })
  }
  const handleTabChange = (value: string) => {
    const href = hrefFor(value)
    if (serverTabs) {
      startSwitch(() => {
        router.replace(href, { scroll: false })
      })
    } else window.history.replaceState(null, '', href)
  }
  return { activeTab, switching, handleTabChange, prefetchTab }
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
  serverTabs = false,
  className,
}: RecordPageLayoutProps) {
  const { activeTab, switching, handleTabChange, prefetchTab } = useRecordTabs({ tabs, defaultTab, serverTabs })
  return (
    <div className={cn('ops-record-page flex min-h-0 flex-col gap-4', className)}>
      {breadcrumbs === undefined ? null : <nav aria-label={labels.breadcrumb}>{breadcrumbs}</nav>}
      <header className="flex flex-wrap items-start gap-3 border-b pb-3">
        <div className="ops-record-title-row flex min-w-0 flex-1 basis-full items-center gap-2 md:basis-auto">
          <RecordTitle title={title} titleLabel={titleLabel} onTitleChange={onTitleChange} labels={labels} />
          {stage}
          {owner}
        </div>
        {actions === undefined ? null : (
          <div className="ops-record-actions flex w-full min-w-0 items-center justify-start gap-2 md:w-auto md:flex-none md:justify-end">
            {actions}
          </div>
        )}
      </header>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-0">
        <TabsList variant="line">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={tab.disabled}
              onPointerEnter={() => {
                prefetchTab(tab.id)
              }}
              onFocus={() => {
                prefetchTab(tab.id)
              }}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div
          aria-busy={switching}
          className={cn(
            'ops-record-grid grid min-h-[28rem] content-start gap-4 transition-opacity lg:grid-cols-[minmax(0,1fr)_320px]',
            switching && 'opacity-60',
          )}
        >
          <div className="min-w-0">
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4">
                {tab.content}
              </TabsContent>
            ))}
          </div>
          {aside === undefined ? null : <aside className="ops-record-aside min-w-0">{aside}</aside>}
        </div>
      </Tabs>
    </div>
  )
}
