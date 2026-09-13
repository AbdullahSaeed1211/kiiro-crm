import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { parseArgs } from 'node:util'
import { effectiveAttempts, isFailure, loadAttempts } from './lib/attempts.ts'
import { createShellRunner } from './lib/exec.ts'
import { detectMilestoneBranch } from './lib/git.ts'
import { anyOverlap } from './lib/globs.ts'
import { loadLessons, type Lesson } from './lib/lessons.ts'
import { dependencyIds, loadPlanRow, scopeEntries, type PlanRow } from './lib/plan-rows.ts'
import { isMain, milestoneOf, paths, readText, REPO_ROOT, runCli } from './lib/repo.ts'
import { fillTemplate } from './lib/template.ts'

export interface BriefOptions {
  root: string
  wp: string
  attempt: number
  milestoneBranch: string
  lessons: Lesson[]
}

const TITLE_LIMIT = 60

/** Short title from the objective: text before the first `:`, `(`, `;` or ` with `, capped at 60 characters. */
export function deriveTitle(objective: string): string {
  const head = (objective.split(/:|\(|;| with /)[0] ?? objective).replace(/\s+/g, ' ').trim()
  if (head.length <= TITLE_LIMIT) return head
  const cut = head.slice(0, TITLE_LIMIT)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`
}

/** `§x.y` references cited in the objective and acceptance, plus the §21.3 table the row came from. */
export function specReferences(row: PlanRow, milestone: string): string {
  const found = [...`${row.objective} ${row.acceptance}`.matchAll(/§\d+(?:\.\d+)*/g)].map((m) => m[0])
  return [...new Set(found), `§21.3 (${milestone} work packages)`].join(', ')
}

/** Active lessons whose affected-path globs overlap the WP write scope. */
export function matchingLessons(lessons: Lesson[], writeScope: string): Lesson[] {
  const scope = scopeEntries(writeScope)
  return lessons.filter((lesson) => lesson.status === 'active' && anyOverlap(lesson.affectedPaths, scope))
}

export function renderPitfalls(lessons: Lesson[]): string {
  if (lessons.length === 0) return 'None.'
  return lessons
    .map(
      (l) =>
        `- **${l.id}** (${l.class}, ${l.severity}): ${l.title}. Countermeasure: ${l.countermeasure.type} at \`${l.countermeasure.location}\`; eval \`${l.eval}\`.`,
    )
    .join('\n')
}

/** Failing gates of the previous attempt (the lead's file when present). */
export function previousFindings(opts: { root: string; wp: string; attempt: number }): string {
  if (opts.attempt <= 1) return 'None (first attempt).'
  const previous = effectiveAttempts(loadAttempts(opts.root).files).find(
    (f) => f.data.wp === opts.wp && f.data.attempt === opts.attempt - 1,
  )
  if (previous === undefined) return `No attempt file for attempt ${String(opts.attempt - 1)}; use the lead's findings.`
  const failed = previous.data.gates.filter(isFailure)
  if (failed.length === 0) return `\`${previous.name}.json\` recorded no failing gates; use the lead's findings.`
  const lines = failed.map(
    (g) => `- \`${g.name}\` exit ${String(g.exitCode)}: ${g.failingLines.slice(0, 3).join(' / ')}`,
  )
  return [`From \`${previous.name}.json\`:`, ...lines].join('\n')
}

function inputsText(row: PlanRow, source: 'plan' | 'spec', lower: string): string {
  const deps = dependencyIds(row.depends)
  const depsText = deps.length > 0 ? `merged work packages ${deps.join(', ')}` : 'no work package dependencies'
  const rowText =
    source === 'plan' ? `row in \`docs/orchestration/${lower}/plan.md\`` : 'spec §21.3 table row (no plan file yet)'
  return `${depsText}; ${rowText}`
}

/** Renders `harness/templates/brief.md` for a WP. */
export function renderBrief(opts: BriefOptions): string {
  const { milestone, lower } = milestoneOf(opts.wp)
  const { row, source } = loadPlanRow(opts.root, opts.wp)
  return fillTemplate(readText(paths.template(opts.root, 'brief')), {
    wp: opts.wp,
    title: deriveTitle(row.objective),
    milestone,
    milestoneLower: lower,
    attempt: String(opts.attempt),
    milestoneBranch: opts.milestoneBranch,
    objective: row.objective,
    specRefs: specReferences(row, milestone),
    writeScope: row.writeScope,
    inputs: inputsText(row, source, lower),
    acceptance: row.acceptance,
    pitfalls: renderPitfalls(matchingLessons(opts.lessons, row.writeScope)),
    previousFindings: previousFindings(opts),
  })
}

function saveBrief(opts: { root: string; wp: string; content: string; force: boolean }): number {
  const file = paths.brief(opts.root, opts.wp)
  if (existsSync(file) && !opts.force) {
    console.error(`${relative(opts.root, file)} exists; pass --force to replace it`)
    return 1
  }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, opts.content)
  console.error(`wrote ${relative(opts.root, file)}`)
  return 0
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      attempt: { type: 'string', default: '1' },
      base: { type: 'string' },
      write: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    },
  })
  const wp = positionals[0] ?? ''
  const { number, lower } = milestoneOf(wp)
  const run = createShellRunner({ root: REPO_ROOT })
  const milestoneBranch = values.base ?? (await detectMilestoneBranch({ root: REPO_ROOT, number, run })) ?? lower
  const { lessons, errors } = loadLessons(REPO_ROOT)
  errors.forEach((e) => {
    console.error(`warning: skipped lesson ${e}`)
  })
  const attempt = Number.parseInt(values.attempt, 10)
  const content = renderBrief({ root: REPO_ROOT, wp, attempt, milestoneBranch, lessons })
  process.stdout.write(content)
  return values.write ? saveBrief({ root: REPO_ROOT, wp, content, force: values.force }) : 0
}

if (isMain(import.meta.url)) runCli(main)
