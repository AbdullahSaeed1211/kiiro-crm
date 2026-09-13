import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** The JSON Schema subset used by `harness/schemas/*.json` (`format` and `$schema`/`title` are ignored). */
export interface JsonSchema {
  type?: string | string[]
  required?: string[]
  enum?: unknown[]
  pattern?: string
  minimum?: number
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  items?: JsonSchema
  properties?: Record<string, JsonSchema>
  additionalProperties?: boolean | JsonSchema
  $ref?: string
  $defs?: Record<string, JsonSchema>
}

export type SchemaName = 'attempt' | 'eval' | 'lesson' | 'report'

interface Context {
  root: JsonSchema
  path: string
  errors: string[]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function own<T>(map: Record<string, T> | undefined, key: string): T | undefined {
  return map !== undefined && Object.hasOwn(map, key) ? map[key] : undefined
}

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case 'integer':
      return Number.isInteger(value)
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'object':
      return isRecord(value)
    case 'array':
      return Array.isArray(value)
    case 'null':
      return value === null
    default:
      return typeof value === type
  }
}

function resolveRef(ref: string, ctx: Context): JsonSchema {
  const name = /^#\/\$defs\/(.+)$/.exec(ref)?.[1]
  const target = name === undefined ? undefined : own(ctx.root.$defs, name)
  if (target === undefined) throw new Error(`unsupported or unknown $ref ${ref}`)
  return target
}

function checkType(schema: JsonSchema, value: unknown, ctx: Context): boolean {
  if (schema.type === undefined) return true
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  if (types.some((t) => typeMatches(t, value))) return true
  ctx.errors.push(`${ctx.path}: expected ${types.join('|')}`)
  return false
}

function checkEnum(schema: JsonSchema, value: unknown, ctx: Context): void {
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    ctx.errors.push(`${ctx.path}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`)
  }
}

function checkString(schema: JsonSchema, value: string, ctx: Context): void {
  if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) {
    ctx.errors.push(`${ctx.path}: does not match pattern ${schema.pattern}`)
  }
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    ctx.errors.push(`${ctx.path}: shorter than ${String(schema.minLength)}`)
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    ctx.errors.push(`${ctx.path}: longer than ${String(schema.maxLength)}`)
  }
}

function checkNumber(schema: JsonSchema, value: number, ctx: Context): void {
  if (schema.minimum !== undefined && value < schema.minimum) {
    ctx.errors.push(`${ctx.path}: less than minimum ${String(schema.minimum)}`)
  }
}

function checkArray(schema: JsonSchema, value: unknown[], ctx: Context): void {
  if (schema.minItems !== undefined && value.length < schema.minItems) {
    ctx.errors.push(`${ctx.path}: fewer than ${String(schema.minItems)} items`)
  }
  if (schema.maxItems !== undefined && value.length > schema.maxItems) {
    ctx.errors.push(`${ctx.path}: more than ${String(schema.maxItems)} items`)
  }
  const items = schema.items
  if (items === undefined) return
  value.forEach((item, i) => {
    visit(items, item, { ...ctx, path: `${ctx.path}[${String(i)}]` })
  })
}

function checkProperty(property: { schema: JsonSchema; key: string; value: unknown }, ctx: Context): void {
  const { schema, key, value } = property
  const childCtx = { ...ctx, path: `${ctx.path}.${key}` }
  const propertySchema = own(schema.properties, key)
  if (propertySchema !== undefined) visit(propertySchema, value, childCtx)
  else if (schema.additionalProperties === false) ctx.errors.push(`${childCtx.path}: additional property not allowed`)
  else if (isRecord(schema.additionalProperties)) visit(schema.additionalProperties, value, childCtx)
}

function checkObject(schema: JsonSchema, value: Record<string, unknown>, ctx: Context): void {
  for (const key of schema.required ?? []) {
    if (!Object.hasOwn(value, key)) ctx.errors.push(`${ctx.path}: missing required property "${key}"`)
  }
  for (const [key, child] of Object.entries(value)) checkProperty({ schema, key, value: child }, ctx)
}

function checkValue(schema: JsonSchema, value: unknown, ctx: Context): void {
  checkEnum(schema, value, ctx)
  if (typeof value === 'string') checkString(schema, value, ctx)
  else if (typeof value === 'number') checkNumber(schema, value, ctx)
  else if (Array.isArray(value)) checkArray(schema, value, ctx)
  else if (isRecord(value)) checkObject(schema, value, ctx)
}

function visit(schema: JsonSchema, value: unknown, ctx: Context): void {
  const effective = schema.$ref === undefined ? schema : resolveRef(schema.$ref, ctx)
  if (checkType(effective, value, ctx)) checkValue(effective, value, ctx)
}

/** Validates `value` against `schema`; returns human-readable errors (empty when valid). */
export function validate(schema: JsonSchema, value: unknown): string[] {
  const ctx: Context = { root: schema, path: '$', errors: [] }
  visit(schema, value, ctx)
  return ctx.errors
}

/** Loads `harness/schemas/<name>.schema.json` from the repository root. */
export function loadSchema(root: string, name: SchemaName): JsonSchema {
  const parsed: unknown = JSON.parse(readFileSync(join(root, 'harness', 'schemas', `${name}.schema.json`), 'utf8'))
  if (!isRecord(parsed)) throw new Error(`schema ${name} is not an object`)
  return parsed
}

/** Throws with every validation error when `value` does not satisfy the named schema. */
export function assertValid(opts: { root: string; name: SchemaName; label: string }, value: unknown): void {
  const errors = validate(loadSchema(opts.root, opts.name), value)
  if (errors.length > 0) throw new Error(`${opts.label} fails ${opts.name} schema:\n  ${errors.join('\n  ')}`)
}
