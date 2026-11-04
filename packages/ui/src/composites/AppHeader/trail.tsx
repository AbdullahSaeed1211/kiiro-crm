'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { BreadcrumbItem, BreadcrumbSeparator } from '@ops/ui/components/ui/breadcrumb'

/** One level of the trail a page reports to the shell. */
export type TrailEntry = Readonly<{ label: string; href?: string }>

/** What the shell learns from the page header: where it is, and the levels the page shows. */
export type ReportedTrail = Readonly<{ pathname: string; entries: readonly TrailEntry[] }>

type TrailContextValue = Readonly<{
  /** Name of the navigation group the current page belongs to, such as "Work". */
  section?: string | undefined
  onTrail?: ((trail: ReportedTrail) => void) | undefined
}>

const TrailContext = createContext<TrailContextValue>({})

/** Lets the shell name the current section and hear which page is open, so titles, recents and breadcrumbs agree. */
export function HeaderTrailProvider({
  section,
  onTrail,
  children,
}: Readonly<{
  section?: string | undefined
  onTrail?: ((trail: ReportedTrail) => void) | undefined
  children: ReactNode
}>) {
  return <TrailContext value={{ section, onTrail }}>{children}</TrailContext>
}

/** Renders the section name before the page crumbs, on wide screens only. */
export function SectionCrumb({ firstLabel }: Readonly<{ firstLabel: string | undefined }>) {
  const { section } = useContext(TrailContext)
  if (section === undefined || section === firstLabel) return null
  return (
    <>
      <BreadcrumbItem className="max-md:hidden text-muted-foreground">{section}</BreadcrumbItem>
      <BreadcrumbSeparator className="max-md:hidden" />
    </>
  )
}

/** Tells the shell which levels this page shows. Renders nothing. */
export function TrailReporter({ entries }: Readonly<{ entries: readonly TrailEntry[] }>) {
  const { onTrail } = useContext(TrailContext)
  const pathname = usePathname()
  const key = entries.map((entry) => `${entry.label}|${entry.href ?? ''}`).join('›')
  useEffect(() => {
    onTrail?.({ pathname, entries })
    // `key` stands for the entries' content; the array itself is new on every render.
  }, [onTrail, pathname, key])
  return null
}
