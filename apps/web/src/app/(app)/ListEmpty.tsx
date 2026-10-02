'use client'

import { Button } from '@ops/ui/components/ui/button'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { Building2, Contact, FolderKanban, Handshake, UserPlus, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { LIST_EMPTY_COPY, type ListKind } from '../../i18n/list-empty-copy'

const ICONS: Readonly<Record<ListKind, LucideIcon>> = {
  leads: UserPlus,
  deals: Handshake,
  contacts: Contact,
  organizations: Building2,
  projects: FolderKanban,
}

interface ListEmptyProps {
  readonly kind: ListKind
  /** True when a search or filter is on, so the list is empty because nothing matched. */
  readonly filtered: boolean
  /** Where "clear" goes: the same list with no search or filters. */
  readonly clearHref: string
  /** The page that creates one; the button shows when the copy has a label for it. */
  readonly createHref?: string
}

function LinkButton({ href, label, outline }: Readonly<{ href: string; label: string; outline?: boolean }>) {
  return (
    <Button
      nativeButton={false}
      variant={outline === true ? 'outline' : 'default'}
      render={<Link href={href}>{label}</Link>}
    >
      {label}
    </Button>
  )
}

/** The empty state of a record list: says "none yet" or "none match", and offers the next step for each. */
export function ListEmpty({ kind, filtered, clearHref, createHref }: ListEmptyProps) {
  const copy = catalogFor(LIST_EMPTY_COPY, useLocale())
  const text = copy.kinds[kind]
  let action: ReactNode = null
  if (filtered) action = <LinkButton href={clearHref} label={copy.clear} outline />
  else if (createHref !== undefined && text.create !== undefined)
    action = <LinkButton href={createHref} label={text.create} />
  return (
    <EmptyState
      icon={ICONS[kind]}
      title={filtered ? text.noMatchTitle : text.emptyTitle}
      description={filtered ? copy.noMatchBody : text.emptyBody}
      action={action}
    />
  )
}
