import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VOCAB_PATTERN, checkVocab, splitWords, vocabFiles } from '../../check-vocab'
import { CLI_TIMEOUT, FIXTURES, runCheck } from './run-check'

const fixture = join(FIXTURES, 'vocab')

describe('check:vocab', () => {
  it('splits camelCase, PascalCase and snake_case identifiers', () => {
    expect(splitWords('createLead LEAD_STATUS HTTPTask')).toBe('create Lead LEAD STATUS HTTP Task')
  })

  it('matches whole words with an optional plural', () => {
    const words = [...'leadership ideal projection tasks Deal contacted'.matchAll(VOCAB_PATTERN)].map(
      (match) => match[0],
    )
    expect(words).toEqual(['tasks', 'Deal'])
  })

  it('scans kernel and platform sources but not tests or modules', () => {
    expect(vocabFiles(fixture)).toEqual([
      'packages/kernel/src/clean.ts',
      'packages/kernel/src/records.ts',
      'packages/platform/src/stages.ts',
    ])
  })

  it('reports planted vocabulary with locations', () => {
    expect(checkVocab(fixture)).toEqual([
      'packages/kernel/src/records.ts:2 Lead',
      'packages/kernel/src/records.ts:3 BOOKING',
      'packages/kernel/src/records.ts:4 tasks',
      'packages/platform/src/stages.ts:1 patients',
    ])
  })

  it('exits 1 on the planted fixture', { timeout: CLI_TIMEOUT }, () => {
    const run = runCheck('check-vocab.ts', ['--root', fixture])
    expect(run.code).toBe(1)
    expect(run.stderr).toContain('packages/kernel/src/records.ts:2 Lead')
  })
})
