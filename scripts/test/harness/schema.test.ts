import { describe, expect, it } from 'vitest'
import { assertValid, loadSchema, validate, type JsonSchema } from '../../harness/lib/schema.ts'
import { attempt, REAL_ROOT } from './helpers.ts'

const attemptSchema = loadSchema(REAL_ROOT, 'attempt')

describe('schema validator on the attempt schema', () => {
  it('accepts a valid attempt', () => {
    expect(validate(attemptSchema, attempt())).toEqual([])
  })

  it('rejects an attempt object missing gates', () => {
    const withoutGates = Object.fromEntries(Object.entries(attempt()).filter(([key]) => key !== 'gates'))
    const errors = validate(attemptSchema, withoutGates)
    expect(errors).toContain('$: missing required property "gates"')
    expect(() => {
      assertValid({ root: REAL_ROOT, name: 'attempt', label: 'fixture' }, withoutGates)
    }).toThrow(/gates/)
  })

  it('reports enum, pattern, minimum, type, items and additionalProperties errors', () => {
    const bad = {
      ...attempt(),
      wp: 'W3',
      runner: 'robot',
      attempt: 0,
      filesChanged: 1.5,
      gates: [{ name: 'lint', exitCode: 1, durationMs: -1, failingLines: Array.from({ length: 21 }, () => 'x') }],
      extra: true,
    }
    const errors = validate(attemptSchema, bad).join('\n')
    expect(errors).toMatch(/\$\.wp: does not match pattern/)
    expect(errors).toMatch(/\$\.runner: must be one of "worker", "lead"/)
    expect(errors).toMatch(/\$\.attempt: less than minimum 1/)
    expect(errors).toMatch(/\$\.filesChanged: expected integer/)
    expect(errors).toMatch(/\$\.gates\[0\]\.durationMs: less than minimum 0/)
    expect(errors).toMatch(/\$\.gates\[0\]\.failingLines: more than 20 items/)
    expect(errors).toMatch(/\$\.extra: additional property not allowed/)
  })
})

describe('schema validator features', () => {
  it('resolves $ref to $defs in the eval schema', () => {
    const evalSchema = loadSchema(REAL_ROOT, 'eval')
    const step = { cwd: '.', command: 'true', expectExitCode: 'zero' }
    expect(validate(evalSchema, { lesson: 'L', repro: step, fixed: step })).toEqual([])
    const errors = validate(evalSchema, { lesson: 'L', repro: { ...step, expectExitCode: 'maybe' }, fixed: {} })
    expect(errors.join('\n')).toMatch(/\$\.repro\.expectExitCode: must be one of/)
    expect(errors.join('\n')).toMatch(/\$\.fixed: missing required property "command"/)
  })

  it('checks string lengths, minItems and schema-valued additionalProperties', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { s: { type: 'string', minLength: 2, maxLength: 3 }, l: { type: 'array', minItems: 1 } },
      additionalProperties: { type: 'integer' },
    }
    expect(validate(schema, { s: 'abcd', l: [], other: 'x' })).toEqual([
      '$.s: longer than 3',
      '$.l: fewer than 1 items',
      '$.other: expected integer',
    ])
    expect(() => validate({ $ref: '#/$defs/missing' }, 1)).toThrow(/unknown \$ref/)
  })
})
