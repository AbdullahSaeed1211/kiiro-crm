import type { z } from 'zod'

/** A query-string parameter an endpoint accepts. */
export interface ApiQueryParam {
  readonly name: string
  readonly description: string
  /** JSON Schema of the value; text when omitted. */
  readonly schema?: Readonly<Record<string, unknown>>
}

/** One product API endpoint in the contract registry. */
export interface ApiContract {
  readonly method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Path with `:param` segments. */
  readonly path: string
  readonly summary: string
  /** JSON body schema; path params are not part of the body. */
  readonly body?: z.ZodType
  /** A JSON Schema for endpoints whose body is checked inside the route rather than by a zod schema here. */
  readonly bodyJson?: Readonly<Record<string, unknown>>
  /** Query-string parameters. */
  readonly query?: readonly ApiQueryParam[]
  /** What the response carries when it is not the usual JSON envelope. */
  readonly returns?: 'csv' | 'file' | 'calendar'
  /** The body is a multipart form with a file. */
  readonly upload?: boolean
  /** Status of a successful response. */
  readonly success: 200 | 201
}
