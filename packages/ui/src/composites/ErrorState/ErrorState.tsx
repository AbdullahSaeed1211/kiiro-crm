import { TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '../EmptyState/EmptyState'

/** Props of {@link ErrorState}. */
export type ErrorStateProps = Readonly<{
  /** Defaults to a warning triangle; no-access states can pass a lock icon. */
  icon?: LucideIcon
  title: string
  description?: string
  /** Recovery control, such as a retry button calling the error boundary's `reset`. */
  action?: ReactNode
}>

/** Error or no-access placeholder (spec §17), announced to assistive technology as an alert. */
export function ErrorState({ icon = TriangleAlert, ...content }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-1 flex-col">
      <EmptyState icon={icon} tone="destructive" {...content} />
    </div>
  )
}
