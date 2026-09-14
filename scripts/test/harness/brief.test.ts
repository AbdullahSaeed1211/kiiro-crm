import { afterEach, describe, expect, it } from 'vitest'
import { deriveTitle, matchingLessons, previousFindings, renderBrief } from '../../harness/brief.ts'
import { loadLessons, type Lesson } from '../../harness/lib/lessons.ts'
import { globsOverlap } from '../../harness/lib/globs.ts'
import { attempt, cleanupRepos, makeRepo, REAL_ROOT, writeAttempt, writeFile } from './helpers.ts'

afterEach(cleanupRepos)

const LESSON_ID = 'L-20260913-M5-W1-a1b2c3'
const LESSON = `---
id: ${LESSON_ID}
milestone: M5
class: AUTHZ_GAP
severity: severe
status: active
affectedPaths:
  - 'packages/platform/src/permissions/**'
countermeasure:
  type: test
  location: packages/platform/test/permissions/matrix.test.ts
eval: ${LESSON_ID}
sourceAttempts: [M5-W1-a1]
---

# Scope filter ignored group membership
`

const SECTIONS = ['**Objective:**', '**Spec references:**', '**Write scope:**', '**Inputs:**', '**Acceptance:**']

describe('renderBrief', () => {
  it('renders every §0.5 field for M0-W1 from the real repository', () => {
    const brief = renderBrief({
      root: REAL_ROOT,
      wp: 'M0-W1',
      attempt: 1,
      milestoneBranch: 'm0-bootstrap',
      lessons: [],
    })
    for (const section of [...SECTIONS, '**Boundaries:**', '**Report:**', '## Known pitfalls']) {
      expect(brief).toContain(section)
    }
    expect(brief).toContain('`pwd` and `git rev-parse --show-toplevel` both equal the assigned worktree')
    expect(brief).toContain('`pnpm vitest run scripts/test/checks`')
    expect(brief).not.toMatch(/\{\{\w+\}\}/)
  })

  it('injects overlapping active lessons and cites spec references and inputs', () => {
    const root = makeRepo({ [`harness/lessons/${LESSON_ID}.md`]: LESSON })
    const { lessons, errors } = loadLessons(root)
    expect(errors).toEqual([])
    const brief = renderBrief({ root, wp: 'M5-W1', attempt: 1, milestoneBranch: 'm5-ui', lessons })
    expect(brief).toContain('# Brief: M5-W1 — Permission policy')
    expect(brief).toContain('**Spec references:** §9.10, §11.1, §21.3 (M5 work packages)')
    expect(brief).toContain('merged work packages M5-L1; spec §21.3 table row (no plan file yet)')
    expect(brief).toContain(`**${LESSON_ID}** (AUTHZ_GAP, severe): Scope filter ignored group membership`)
    const other = renderBrief({ root, wp: 'M5-W2', attempt: 1, milestoneBranch: 'm5-ui', lessons })
    expect(other).toContain('## Known pitfalls\nNone.')
  })

  it('ignores retired lessons', () => {
    const root = makeRepo({ [`harness/lessons/${LESSON_ID}.md`]: LESSON.replace('status: active', 'status: retired') })
    const scope = '`packages/platform/src/permissions/`'
    expect(matchingLessons(loadLessons(root).lessons, scope)).toEqual([])
  })
})

describe('brief helpers', () => {
  it('summarises the previous attempt, preferring the lead file', () => {
    const root = makeRepo()
    const failing = { name: 'lint', exitCode: 1, durationMs: 5, failingLines: ['worker line'] }
    writeAttempt(root, attempt({ gates: [failing] }))
    writeAttempt(root, attempt({ runner: 'lead', gates: [{ ...failing, failingLines: ['lead line'] }] }))
    const text = previousFindings({ root, wp: 'M5-W1', attempt: 2 })
    expect(text).toContain('M5-W1-a1-lead.json')
    expect(text).toContain('`lint` exit 1: lead line')
    expect(previousFindings({ root, wp: 'M5-W1', attempt: 1 })).toBe('None (first attempt).')
    expect(previousFindings({ root, wp: 'M5-W2', attempt: 2 })).toMatch(/No attempt file/)
  })

  it('derives short titles', () => {
    expect(deriveTitle('Core harness scripts: plan, brief')).toBe('Core harness scripts')
    expect(deriveTitle('a '.repeat(50)).length).toBeLessThanOrEqual(61)
  })

  it('reports invalid lesson files without throwing', () => {
    const root = makeRepo()
    writeFile(root, 'harness/lessons/L-bad.md', '---\nid: nope\n---\n')
    const lessons: Lesson[] = loadLessons(root).lessons
    expect(lessons).toEqual([])
    expect(loadLessons(root).errors[0]).toMatch(/L-bad\.md: .*missing required property/)
  })
})

describe('globsOverlap', () => {
  it.each([
    ['packages/platform/src/permissions/**', 'packages/platform/src/permissions/', true],
    ['packages/platform/**', 'packages/platform/src/permissions/can.ts', true],
    ['scripts/check-*.ts', 'scripts/check-scope.ts', true],
    ['scripts/check-*.ts', 'scripts/*.ts', true],
    ['packages/{kernel,platform}/src/**', 'packages/platform/src/index.ts', true],
    ['**/access/**', 'packages/adapters/payload/src/access/', true],
    ['packages/ui/**', 'packages/platform/src/', false],
    ['scripts/check-*.ts', 'scripts/harness/', false],
  ])('%s vs %s → %s', (a, b, expected) => {
    expect(globsOverlap(a, b)).toBe(expected)
  })
})
