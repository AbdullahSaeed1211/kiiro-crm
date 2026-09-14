import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { analyzeRetro, renderRetro, runRetro } from '../../harness/retro.ts'
import { loadAttempts } from '../../harness/lib/attempts.ts'
import { loadConfig } from '../../harness/lib/config.ts'
import { lessonId, loadLessons, splitFrontMatter } from '../../harness/lib/lessons.ts'
import { loadSchema, validate } from '../../harness/lib/schema.ts'
import { attempt, cleanupRepos, makeRepo, writeAttempt } from './helpers.ts'

afterEach(cleanupRepos)

const DATE = new Date('2026-09-13T08:00:00.000Z')
const failing = [{ name: 'lint', exitCode: 1, durationMs: 2000, failingLines: ['error'] }]

function seed(root: string): void {
  writeAttempt(root, attempt({ suggestedClasses: ['AUTHZ_GAP'], gates: failing }))
  writeAttempt(root, attempt({ attempt: 2, suggestedClasses: ['GATE_FAILURE'] }))
  writeAttempt(root, attempt({ attempt: 2, runner: 'lead', confirmedClasses: ['FLAKY_TEST'], leadTookOver: true }))
  writeAttempt(root, attempt({ wp: 'M5-W2', suggestedClasses: ['GATE_FAILURE'] }))
  writeAttempt(root, attempt({ wp: 'M4-W1', milestone: 'M4', suggestedClasses: ['DOC_GAP'] }))
  writeAttempt(root, attempt({ wp: 'M4-W2', milestone: 'M4', suggestedClasses: ['DOC_GAP'] }))
  writeAttempt(root, attempt({ wp: 'M5-L1', suggestedClasses: ['DOC_GAP'] }))
}

describe('analyzeRetro', () => {
  it('promotes severe classes at once and ordinary ones over thresholds, lead files winning', () => {
    const root = makeRepo()
    seed(root)
    const analysis = analyzeRetro({ files: loadAttempts(root).files, config: loadConfig(root), lessons: [], n: 5 })
    expect(analysis.candidates.map((c) => [c.cls, c.inMilestone, c.cumulative])).toEqual([
      ['AUTHZ_GAP', 1, 1],
      ['DOC_GAP', 1, 3],
    ])
    expect(analysis.classes.find((c) => c.cls === 'GATE_FAILURE')?.inMilestone).toBe(1)
    expect(analysis.candidates[1]?.sources[0]?.name).toBe('M5-L1-a1')
    expect(analysis.wpStats).toEqual([
      { wp: 'M5-L1', attempts: 1, firstPass: true, retries: 0, tookOver: false, gateMs: 1000 },
      { wp: 'M5-W1', attempts: 2, firstPass: false, retries: 1, tookOver: true, gateMs: 4000 },
      { wp: 'M5-W2', attempts: 1, firstPass: true, retries: 0, tookOver: false, gateMs: 1000 },
    ])
    expect(renderRetro(analysis)).toContain('- First-pass rate: 2/3 (67%)')
  })

  it('counts ordinary classes twice in a milestone', () => {
    const root = makeRepo()
    writeAttempt(root, attempt({ suggestedClasses: ['SPEC_MISREAD'] }))
    writeAttempt(root, attempt({ wp: 'M5-W2', suggestedClasses: ['SPEC_MISREAD'] }))
    const analysis = analyzeRetro({ files: loadAttempts(root).files, config: loadConfig(root), lessons: [], n: 5 })
    expect(analysis.candidates.map((c) => c.cls)).toEqual(['SPEC_MISREAD'])
  })
})

describe('first-pass analysis', () => {
  it('does not call a green first attempt first-pass when a retry exists', () => {
    const root = makeRepo()
    writeAttempt(root, attempt({ wp: 'M5-W3' }))
    writeAttempt(root, attempt({ wp: 'M5-W3', attempt: 2 }))

    const analysis = analyzeRetro({
      files: loadAttempts(root).files,
      config: loadConfig(root),
      lessons: [],
      n: 5,
    })

    expect(analysis.wpStats).toContainEqual({
      wp: 'M5-W3',
      attempts: 2,
      firstPass: false,
      retries: 1,
      tookOver: false,
      gateMs: 2000,
    })
  })
})

describe('runRetro scaffolding', () => {
  it('scaffolds a schema-valid lesson and eval once, and skips classes with an active lesson', () => {
    const root = makeRepo()
    writeAttempt(root, attempt({ suggestedClasses: ['AUTHZ_GAP'], scopeViolations: ['tenants/a.jsonc'] }))
    expect(runRetro({ root, n: 5, dryRun: true, date: DATE }).join('\n')).toContain('dry run, nothing scaffolded')
    expect(loadLessons(root).lessons).toEqual([])

    const output = runRetro({ root, n: 5, dryRun: false, date: DATE }).join('\n')
    const id = lessonId({ date: DATE, wp: 'M5-W1', title: 'AUTHZ_GAP in M5-W1' })
    expect(id).toMatch(/^L-20260913-M5-W1-[0-9a-f]{6}$/)
    expect(output).toContain(`scaffolded ${id}`)
    const { lessons, errors } = loadLessons(root)
    expect(errors).toEqual([])
    expect(lessons[0]?.affectedPaths).toEqual([
      'packages/platform/src/permissions/**',
      'packages/platform/test/permissions/**',
      'tenants/a.jsonc',
    ])
    const manifest: unknown = JSON.parse(readFileSync(join(root, 'harness', 'evals', id, 'eval.json'), 'utf8'))
    expect(validate(loadSchema(root, 'eval'), manifest)).toEqual([])
    expect(existsSync(join(root, 'harness', 'evals', id, 'repro', 'README.md'))).toBe(true)

    expect(runRetro({ root, n: 5, dryRun: false, date: DATE }).join('\n')).toContain('## Promotion candidates\nNone.')
  })

  it('reads JSON front matter too', () => {
    expect(splitFrontMatter('---\n{"id": "x"}\n---\n# T')).toEqual({ data: { id: 'x' }, body: '# T' })
    expect(splitFrontMatter('# no front matter')).toBeUndefined()
  })
})
