import type { MonthlyDesignConfig } from '../ports/work'

export interface MonthlyDesignCycle {
  readonly issueDate: string
  readonly dueDate: string
  readonly issueMonth: string
  readonly issueAt: number
  readonly dueAt: number
}

/** Calendar date for the configured day, clamped to the month end. */
export function monthlyDesignDate(year: number, month: number, day: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${String(year)}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

/** Stable ISO calendar-date key for an instant in the tenant timezone. */
export function monthlyDesignLocalDate(timestamp: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp)
}

function nextMonth(year: number, month: number): { readonly year: number; readonly month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

function cycleFor(config: MonthlyDesignConfig, year: number, month: number): MonthlyDesignCycle {
  const issueDate = monthlyDesignDate(year, month, config.issueDay)
  const dueMonth = nextMonth(year, month)
  const dueDate = monthlyDesignDate(dueMonth.year, dueMonth.month, config.dueDay)
  return {
    issueDate,
    dueDate,
    issueMonth: issueDate.slice(0, 7),
    issueAt: Date.parse(`${issueDate}T00:00:00.000Z`),
    dueAt: Date.parse(`${dueDate}T00:00:00.000Z`),
  }
}

/** The current tenant-local cycle, including whether its issue date has arrived since activation. */
export function currentMonthlyDesignCycle(
  config: MonthlyDesignConfig,
  now: number,
  timeZone: string,
): MonthlyDesignCycle & { readonly due: boolean } {
  const today = monthlyDesignLocalDate(now, timeZone)
  const [yearPart, monthPart] = today.split('-')
  const cycle = cycleFor(config, Number(yearPart), Number(monthPart))
  const activatedOn = monthlyDesignLocalDate(config.effectiveFrom, timeZone)
  return { ...cycle, due: config.enabled && today >= cycle.issueDate && cycle.issueDate >= activatedOn }
}

/** The nearest not-yet-past cycle the UI can preview, skipping dates before activation. */
export function nextMonthlyDesignCycle(config: MonthlyDesignConfig, now: number, timeZone: string): MonthlyDesignCycle {
  const today = monthlyDesignLocalDate(now, timeZone)
  const [yearPart, monthPart] = today.split('-')
  let year = Number(yearPart)
  let month = Number(monthPart)
  let cycle = cycleFor(config, year, month)
  const activatedOn = monthlyDesignLocalDate(config.effectiveFrom, timeZone)
  for (let attempt = 0; (cycle.issueDate < today || cycle.issueDate < activatedOn) && attempt < 120; attempt += 1) {
    ;({ year, month } = nextMonth(year, month))
    cycle = cycleFor(config, year, month)
  }
  return cycle
}
