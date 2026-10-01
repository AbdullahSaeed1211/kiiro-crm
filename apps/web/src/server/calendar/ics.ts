/** One all-day entry in a calendar feed. `day` is `YYYY-MM-DD`. */
export interface FeedEvent {
  readonly uid: string
  readonly day: string
  readonly summary: string
  readonly description: string
  readonly url: string
}

const MAX_LINE = 73

const escapeText = (text: string): string =>
  text
    .replaceAll('\\', '\\\\')
    .replaceAll(';', String.raw`\;`)
    .replaceAll(',', String.raw`\,`)
    .replaceAll(/\r?\n/gu, String.raw`\n`)

/** Folds a long line the way RFC 5545 asks: continuation lines start with one space. */
function fold(line: string): string {
  const parts: string[] = []
  for (let at = 0; at < line.length; at += MAX_LINE) parts.push(line.slice(at, at + MAX_LINE))
  return parts.join('\r\n ')
}

const compact = (day: string): string => day.replaceAll('-', '')

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function lines(event: FeedEvent, stamp: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(event.day)}`,
    `DTEND;VALUE=DATE:${compact(nextDay(event.day))}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`,
    'END:VEVENT',
  ]
}

/** An iCalendar (.ics) document that Google Calendar, Apple Calendar and Outlook can subscribe to. */
export function buildIcs(input: {
  readonly name: string
  readonly events: readonly FeedEvent[]
  readonly now: Date
}): string {
  const stamp = input.now
    .toISOString()
    .replaceAll(/[-:]/gu, '')
    .replace(/\.\d{3}/u, '')
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ops-platform//calendar feed//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(input.name)}`,
    ...input.events.flatMap((event) => lines(event, stamp)),
    'END:VCALENDAR',
  ]
  return `${body.map(fold).join('\r\n')}\r\n`
}
