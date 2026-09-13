import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseConfig } from '../../harness/lib/config.ts'
import { readText } from '../../harness/lib/repo.ts'
import { parseScalar, parseYaml, stringifyYaml } from '../../harness/lib/yaml.ts'
import { REAL_ROOT } from './helpers.ts'

describe('parseYaml', () => {
  it('parses the real harness config', () => {
    const config = parseConfig(readText(join(REAL_ROOT, 'harness', 'config.yaml')))
    expect(config.severeClasses).toContain('AUTHZ_GAP')
    expect(config.ordinaryInMilestone).toBe(2)
    expect(config.ordinaryCumulative).toBe(3)
    expect(config.gateClassMap['check:scope']).toBe('SCOPE_VIOLATION')
    expect(config.gateClassMap['test:permissions']).toBe('AUTHZ_GAP')
  })

  it('handles comments, quoted keys, nested maps and both list styles', () => {
    const doc = parseYaml(
      [
        '# header',
        'a: 1 # trailing',
        '\'b:c\': "x # not a comment"',
        'nested:',
        '  list:',
        '  - one',
        "  - 'two'",
        '  flow: [a, "b, c", 3]',
        'empty: []',
        'flag: true',
      ].join('\n'),
    )
    expect(doc).toEqual({
      a: 1,
      'b:c': 'x # not a comment',
      nested: { list: ['one', 'two'], flow: ['a', 'b, c', 3] },
      empty: [],
      flag: true,
    })
  })

  it('rejects lines it cannot place', () => {
    expect(() => parseYaml('a: 1\n    b: 2')).toThrow(/line 2/)
    expect(() => parseYaml('just text')).toThrow(/key: value/)
  })
})

describe('parseYaml list items', () => {
  it('parses lists of maps such as report acceptance entries, keeping quoted scalars', () => {
    const doc = parseYaml(
      [
        'acceptance:',
        "  - command: 'pnpm vitest run x'",
        '    exitCode: 0',
        '    evidence: passed',
        '  - command: pnpm lint',
        '    exitCode: 1',
        'notes:',
        "  - 'Note: quoted scalar'",
        '  - plain',
      ].join('\n'),
    )
    expect(doc).toEqual({
      acceptance: [
        { command: 'pnpm vitest run x', exitCode: 0, evidence: 'passed' },
        { command: 'pnpm lint', exitCode: 1 },
      ],
      notes: ['Note: quoted scalar', 'plain'],
    })
  })
})

describe('stringifyYaml', () => {
  it('round-trips lesson-shaped front matter', () => {
    const value = {
      id: 'L-20260913-M0-X1-abcdef',
      affectedPaths: ['packages/platform/src/permissions/**', "it's"],
      countermeasure: { type: 'test', location: 'TODO' },
      status: 'active',
      count: 2,
      literal: 'true',
      none: [],
    }
    expect(parseYaml(stringifyYaml(value))).toEqual(value)
  })

  it('keeps plain scalars readable', () => {
    expect(parseScalar('-12')).toBe(-12)
    expect(parseScalar('~')).toBeNull()
    expect(parseScalar('constructor')).toBe('constructor')
  })
})
