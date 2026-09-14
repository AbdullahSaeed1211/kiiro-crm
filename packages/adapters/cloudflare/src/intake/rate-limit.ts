/** Structural subset of a Cloudflare Rate Limit binding. */
export interface RateLimitBinding {
  limit(options: { readonly key: string }): Promise<{ readonly success: boolean }>
}

/** A local fixture implementation that is deterministic and resets by fixed windows. */
export class InMemoryRateLimiter {
  private readonly seen = new Map<string, { readonly window: number; readonly count: number }>()
  constructor(
    private readonly limit: number,
    private readonly periodMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}
  check(key: string): Promise<boolean> {
    const window = Math.floor(this.now() / this.periodMs)
    const prior = this.seen.get(key)
    const count = prior?.window === window ? prior.count : 0
    if (count >= this.limit) return Promise.resolve(false)
    this.seen.set(key, { window, count: count + 1 })
    return Promise.resolve(true)
  }
}

/** Adapts a Cloudflare rate-limit binding and fails closed when the provider is unavailable. */
export function createRateLimiter(binding: RateLimitBinding | undefined): { check(key: string): Promise<boolean> } {
  return {
    check: async (key) => {
      if (binding === undefined) return false
      try {
        return (await binding.limit({ key })).success
      } catch {
        return false
      }
    },
  }
}
