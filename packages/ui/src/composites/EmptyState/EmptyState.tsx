import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@ops/ui/components/ui/empty'

/** Props of {@link EmptyState}. */
export type EmptyStateProps = Readonly<{
  /** Usually the sidebar icon of the record type (spec §17.5). */
  icon?: LucideIcon
  title: string
  description?: string
  /** Call to action such as a New button. */
  action?: ReactNode
  /** `destructive` tints the icon for error and no-access states. */
  tone?: 'default' | 'destructive'
}>

const MEDIA_TONE = {
  default: undefined,
  destructive: 'bg-destructive/10 text-destructive',
} as const

/** Centered placeholder for an empty list or section, with optional icon, description and action. */
export function EmptyState({ icon: Icon, title, description, action, tone = 'default' }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        {Icon === undefined ? null : (
          <EmptyMedia variant="icon" className={MEDIA_TONE[tone]}>
            <Icon aria-hidden />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description === undefined ? null : <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action === undefined ? null : <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
