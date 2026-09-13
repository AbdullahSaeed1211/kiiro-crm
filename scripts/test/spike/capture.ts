import { vi } from 'vitest'

/** Runs `fn` with `console.log` captured; returns the printed lines joined by newlines. */
export async function captureLog(fn: () => Promise<unknown>): Promise<string> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  try {
    await fn()
    return log.mock.calls.map((call) => call.map(String).join(' ')).join('\n')
  } finally {
    log.mockRestore()
  }
}
