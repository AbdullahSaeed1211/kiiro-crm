import type { z } from 'zod'

/** One product API endpoint in the contract registry. */
export interface ApiContract {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Path with `:param` segments. */
  readonly path: string
  readonly summary: string
  /** JSON body schema; path params are not part of the body. */
  readonly body?: z.ZodType
  /** Status of a successful response. */
  readonly success: 200 | 201
}
