const WORKSPACE_TIME_ZONE = 'America/New_York'

function partsAt(value: number): Record<string, number> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: WORKSPACE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  )
}

export function timeAtWorkspace(value: number | null): string {
  if (value === null) return '10:00'
  const parts = partsAt(value)
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

export function workspaceDateTime(date: number | null, time: string): number | null {
  if (date === null) return null
  const [hourPart, minutePart] = time.split(':')
  const hour = Number(hourPart || '10')
  const minute = Number(minutePart || '0')
  const day = new Date(date)
  const target = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute)
  let result = target
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = partsAt(result)
    const rendered = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    result += target - rendered
  }
  return result
}
