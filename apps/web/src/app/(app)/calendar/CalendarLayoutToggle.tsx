import Link from 'next/link'
import type { CalendarCopy } from '../../../i18n/calendar-copy'

export function CalendarLayoutToggle({
  active,
  monthHref,
  agendaHref,
  copy,
}: Readonly<{
  active: 'month' | 'agenda'
  monthHref: string
  agendaHref: string
  copy: CalendarCopy
}>) {
  const choices = [
    { id: 'month', label: copy.month, href: monthHref },
    { id: 'agenda', label: copy.agenda, href: agendaHref },
  ] as const
  return (
    <nav aria-label={copy.layout} className="inline-flex rounded-md border p-0.5">
      {choices.map((choice) => (
        <Link
          key={choice.id}
          href={choice.href}
          aria-current={active === choice.id ? 'page' : undefined}
          className={`rounded px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === choice.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {choice.label}
        </Link>
      ))}
    </nav>
  )
}
