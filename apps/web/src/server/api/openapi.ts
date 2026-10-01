import { apiIndex, type ApiIndexEntry } from './contracts'

const ERROR_CODES = [
  'VALIDATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'ALREADY_DONE',
  'RATE_LIMITED',
  'UNAVAILABLE',
  'INTERNAL',
] as const

const JSON_TYPE = 'application/json'
const failureSchema = { $ref: '#/components/schemas/Failure' }

const FAILURE_STATUSES: Readonly<Record<string, string>> = {
  '400': 'The request is not valid (VALIDATION); error.fields names each bad input.',
  '401': 'No active session (UNAUTHORIZED).',
  '403': 'Not allowed for this person (FORBIDDEN).',
  '404': 'No such record, or one outside this person’s access (NOT_FOUND).',
  '409': 'The record changed since expectedUpdatedAt, or the action does not fit its state (CONFLICT).',
}

const FAILURES = Object.fromEntries(
  Object.entries(FAILURE_STATUSES).map(([status, description]) => [
    status,
    { description, content: { [JSON_TYPE]: { schema: failureSchema } } },
  ]),
)

const UPLOAD_BODY = {
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        properties: {
          recordType: { type: 'string' },
          recordId: { type: 'string' },
          file: { type: 'string', format: 'binary' },
        },
        required: ['recordType', 'recordId', 'file'],
      },
    },
  },
}

const pathOf = (path: string): string => path.replaceAll(/:([A-Za-z]+)/gu, '{$1}')

function parametersOf(entry: ApiIndexEntry): Record<string, unknown>[] {
  const fromPath = [...entry.path.matchAll(/:([A-Za-z]+)/gu)].map((match) => ({
    name: match[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }))
  const fromQuery = (entry.query ?? []).map((param) => ({
    name: param.name,
    in: 'query',
    description: param.description,
    schema: param.schema ?? { type: 'string' },
  }))
  return [...fromPath, ...fromQuery]
}

function requestBodyOf(entry: ApiIndexEntry): Record<string, unknown> | undefined {
  if (entry.upload === true) return UPLOAD_BODY
  return entry.body === undefined ? undefined : { required: true, content: { [JSON_TYPE]: { schema: entry.body } } }
}

function successContent(entry: ApiIndexEntry): Record<string, unknown> {
  if (entry.returns === 'csv') return { 'text/csv': { schema: { type: 'string' } } }
  if (entry.returns === 'file') return { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } }
  return { [JSON_TYPE]: { schema: { $ref: '#/components/schemas/Success' } } }
}

function operationOf(entry: ApiIndexEntry): Record<string, unknown> {
  const parameters = parametersOf(entry)
  const requestBody = requestBodyOf(entry)
  return {
    operationId: entry.id,
    summary: entry.summary,
    tags: [entry.id.split('.')[0]],
    ...(parameters.length === 0 ? {} : { parameters }),
    ...(requestBody === undefined ? {} : { requestBody }),
    responses: { [String(entry.success)]: { description: 'Success', content: successContent(entry) }, ...FAILURES },
  }
}

const COMPONENTS = {
  securitySchemes: {
    session: {
      type: 'apiKey',
      in: 'cookie',
      name: 'payload-token',
      description: 'The cookie set by POST /api/v1/auth/login.',
    },
    bearer: { type: 'http', scheme: 'bearer', description: 'An API token made under Settings, Profile.' },
  },
  schemas: {
    Success: { type: 'object', properties: { ok: { const: true }, data: {} }, required: ['ok', 'data'] },
    Failure: {
      type: 'object',
      properties: {
        ok: { const: false },
        error: {
          type: 'object',
          properties: {
            code: { enum: [...ERROR_CODES] },
            message: { type: 'string' },
            fields: { type: 'object', additionalProperties: { type: 'string' } },
          },
          required: ['code', 'message'],
        },
      },
      required: ['ok', 'error'],
    },
  },
}

const DESCRIPTION =
  'Every JSON response is { ok: true, data } or { ok: false, error: { code, message, fields? } }. Lists return data: { records, total, page, pageSize, hasMore } and take ?page= and ?limit=. A record that changes takes expectedUpdatedAt, and a stale one is refused with 409.'

/** The product API as an OpenAPI 3.1 document, built from the same registry that validates requests. */
export function openApiDocument(origin: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const entry of apiIndex()) {
    const key = pathOf(entry.path)
    paths[key] = { ...paths[key], [entry.method.toLowerCase()]: operationOf(entry) }
  }
  return {
    openapi: '3.1.0',
    info: { title: 'Workspace API', version: '1', description: DESCRIPTION },
    servers: [{ url: origin }],
    security: [{ session: [] }, { bearer: [] }],
    paths,
    components: COMPONENTS,
  }
}
