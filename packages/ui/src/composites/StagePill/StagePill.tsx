import { cn } from '@ops/ui/lib/utils'
import { stageDotClass, stagePillClass, type StageColor } from './stage'

/** Props of {@link StagePill}. */
export type StagePillProps = Readonly<{
  name: string
  color: StageColor
  size?: 'sm' | 'md'
  className?: string | undefined
}>

const SIZES = {
  sm: { pill: 'h-5 gap-1.5 px-2 text-xs', dot: 'size-1.5' },
  md: { pill: 'h-6 gap-2 px-2.5 text-sm', dot: 'size-2' },
} as const

/** Decorative stage color dot; always pair it with the stage name. */
export function StageDot({ color, className }: Readonly<{ color: StageColor; className?: string | undefined }>) {
  return <span aria-hidden className={cn('size-2 shrink-0 rounded-full', stageDotClass(color), className)} />
}

/** Stage name with its color dot (spec §15.4); the name is always visible, so color is never the only signal. */
export function StagePill({ name, color, size = 'md', className }: StagePillProps) {
  const classes = SIZES[size]
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-full border bg-background font-medium whitespace-nowrap text-foreground',
        stagePillClass(color),
        classes.pill,
        className,
      )}
    >
      <StageDot color={color} className={classes.dot} />
      <span className="truncate">{name}</span>
    </span>
  )
}
