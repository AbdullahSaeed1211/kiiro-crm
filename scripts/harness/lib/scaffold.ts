import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import type { AttemptFile } from './attempts.ts'
import { lessonId } from './lessons.ts'
import { loadPlanRow, scopeEntries } from './plan-rows.ts'
import { paths } from './repo.ts'
import { assertValid } from './schema.ts'
import { stringifyYaml, type YamlValue } from './yaml.ts'

/** A class that crossed a promotion threshold without an active lesson. */
export interface Candidate {
  cls: string
  severity: 'severe' | 'ordinary'
  inMilestone: number
  cumulative: number
  /** Effective attempt files carrying the class; current-milestone sources first. */
  sources: AttemptFile[]
}

export interface ScaffoldResult {
  id: string
  created: boolean
  files: string[]
}

function toGlob(entry: string): string {
  return entry.endsWith('/') ? `${entry}**` : entry
}

/** Write scopes of the source WPs plus their reported scope violations. */
export function affectedPaths(root: string, sources: AttemptFile[]): string[] {
  const globs = sources.flatMap((source) => {
    let scope: string[] = []
    try {
      scope = scopeEntries(loadPlanRow(root, source.data.wp).row.writeScope).map(toGlob)
    } catch {
      scope = []
    }
    return [...scope, ...source.data.scopeViolations]
  })
  const unique = [...new Set(globs)]
  return unique.length > 0 ? unique : ['TODO/**']
}

function lessonBody(opts: { title: string; id: string; candidate: Candidate; milestone: string }): string {
  const sources = opts.candidate.sources.map((s) => s.name).join(', ')
  return [
    `# ${opts.title}`,
    '',
    `Scaffolded by \`pnpm harness:retro ${opts.milestone.toLowerCase()}\`. The lead replaces every TODO and completes the eval before the next milestone's wave 0 (spec §26.5, §26.8).`,
    '',
    '## Symptom',
    `TODO. Source attempts: ${sources}.`,
    '',
    '## Cause',
    'TODO.',
    '',
    '## Countermeasure',
    'TODO: set `countermeasure.type` and `countermeasure.location` and describe the check, test, brief clause, checklist item or ADR.',
    '',
    '## Eval',
    `\`harness/evals/${opts.id}/eval.json\`: \`repro/\` must fail (reproduce the original failure) and \`fixed/\` must pass.`,
    '',
  ].join('\n')
}

function evalManifest(id: string): Record<string, unknown> {
  const dir = `harness/evals/${id}`
  const todo = (step: string): string => `echo 'TODO: implement the ${step} step of ${id}' >&2; exit 1`
  return {
    lesson: id,
    repro: { cwd: `${dir}/repro`, command: todo('repro'), expectExitCode: 'nonzero' },
    fixed: { cwd: `${dir}/fixed`, command: todo('fixed'), expectExitCode: 'zero' },
  }
}

/** Writes each file that does not exist yet; returns the paths written. */
function writeMissing(files: [string, string][]): string[] {
  return files.flatMap(([file, content]) => {
    if (existsSync(file)) return []
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
    return [file]
  })
}

function lessonFrontMatter(opts: {
  root: string
  id: string
  candidate: Candidate
  milestone: string
}): Record<string, YamlValue> {
  const { candidate, id } = opts
  return {
    ...{ id, milestone: opts.milestone, class: candidate.cls, severity: candidate.severity, status: 'active' },
    affectedPaths: affectedPaths(opts.root, candidate.sources),
    countermeasure: { type: candidate.severity === 'severe' ? 'test' : 'check', location: 'TODO' },
    ...{ eval: id, sourceAttempts: candidate.sources.map((s) => s.name) },
  }
}

/** Creates `harness/lessons/<id>.md` and `harness/evals/<id>/{repro,fixed,eval.json}`; existing files are kept. */
export function scaffoldLesson(opts: {
  root: string
  candidate: Candidate
  milestone: string
  date: Date
}): ScaffoldResult {
  const { candidate, root, milestone } = opts
  const wps = [...new Set(candidate.sources.map((s) => s.data.wp))]
  const title = `${candidate.cls} in ${wps.join(', ')}`
  const id = lessonId({ date: opts.date, wp: wps[0] ?? 'M0-L1', title })
  const frontMatter = lessonFrontMatter({ root, id, candidate, milestone })
  assertValid({ root, name: 'lesson', label: `lesson ${id}` }, frontMatter)
  const manifest = evalManifest(id)
  assertValid({ root, name: 'eval', label: `eval ${id}` }, manifest)
  const evalDir = join(paths.evals(root), id)
  const lessonFile = join(paths.lessons(root), `${id}.md`)
  const created = !existsSync(lessonFile)
  const readme = (step: string): [string, string] => [
    join(evalDir, step, 'README.md'),
    `# ${id} ${step}\n\nTODO: fixture for the ${step} step.\n`,
  ]
  const written = writeMissing([
    [lessonFile, `---\n${stringifyYaml(frontMatter)}---\n\n${lessonBody({ title, id, candidate, milestone })}`],
    [join(evalDir, 'eval.json'), `${JSON.stringify(manifest, null, 2)}\n`],
    readme('repro'),
    readme('fixed'),
  ])
  return { id, created, files: written.map((f) => relative(root, f)) }
}
