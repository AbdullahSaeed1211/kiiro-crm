export interface DeliveryRow {
  readonly id: string
  readonly at: number
  readonly name: string
  readonly event: string
  readonly ok: boolean
  readonly status: number | null
  readonly attempts: number
  readonly error: string
}

const when = (time: number): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(time) + ' UTC'

function outcome(row: DeliveryRow): string {
  if (row.ok) return `Delivered (HTTP ${String(row.status)})`
  if (row.status === null) return `Not reached (${row.error === '' ? 'error' : row.error})`
  return `${row.status >= 500 ? 'Receiver error' : 'Refused'} (HTTP ${String(row.status)})`
}

/** What the other systems answered to the latest events, kept for two weeks. */
export function DeliveryLog({ rows }: Readonly<{ rows: readonly DeliveryRow[] }>) {
  return (
    <div className="grid gap-2 text-sm">
      <h2 className="font-medium">Recent deliveries</h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing has been sent yet. Each event, and what the other system answered, is listed here for two weeks.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
              <span>
                <span className="font-medium">{row.name}</span> · {row.event}
                <span className="block text-xs text-muted-foreground">{when(row.at)}</span>
              </span>
              <span className={row.ok ? 'text-muted-foreground' : 'text-destructive'}>
                {outcome(row)}
                {row.attempts > 1 ? `, ${String(row.attempts)} tries` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
