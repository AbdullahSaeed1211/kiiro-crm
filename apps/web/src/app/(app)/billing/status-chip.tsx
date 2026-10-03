const TONE: Readonly<Record<string, string | undefined>> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  accepted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  paid: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  declined: 'bg-red-500/15 text-red-700 dark:text-red-300',
  overdue: 'bg-red-500/15 text-red-700 dark:text-red-300',
  expired: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  void: 'bg-muted text-muted-foreground line-through',
}

/** A document state as a small coloured label. */
export function StatusChip({ status, label }: Readonly<{ status: string; label: string }>) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status] ?? TONE.draft ?? ''}`}>{label}</span>
  )
}
