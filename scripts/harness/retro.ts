import { classesOf, effectiveAttempts, isFailure, loadAttempts, type AttemptFile } from './lib/attempts.ts'
import { loadConfig, type HarnessConfig } from './lib/config.ts'
import { loadLessons, type Lesson } from './lib/lessons.ts'
import { isMain, parseMilestoneCommand, REPO_ROOT, runCli } from './lib/repo.ts'
import { scaffoldLesson, type Candidate } from './lib/scaffold.ts'

export interface WpStat {
  wp: string
  attempts: number
  firstPass: boolean
  retries: number
  tookOver: boolean
  gateMs: number
}

export interface RetroAnalysis {
  milestone: string
  classes: { cls: string; severity: Candidate['severity']; inMilestone: number; cumulative: number; lesson: boolean }[]
  candidates: Candidate[]
  wpStats: WpStat[]
}

function milestoneNumber(file: AttemptFile): number {
  return Number.parseInt(file.data.milestone.slice(1), 10)
}

/** Effective attempt files per class. */
export function filesByClass(files: AttemptFile[]): Map<string, AttemptFile[]> {
  const map = new Map<string, AttemptFile[]>()
  for (const file of effectiveAttempts(files)) {
    for (const cls of classesOf(file.data)) map.set(cls, [...(map.get(cls) ?? []), file])
  }
  return map
}

/** Per-WP first-pass, retries, takeover and total gate duration (all runners) for one milestone. */
export function wpStats(files: AttemptFile[]): WpStat[] {
  const wps = [...new Set(files.map((f) => f.data.wp))].sort((a, b) => a.localeCompare(b))
  const effective = effectiveAttempts(files)
  return wps.map((wp) => {
    const own = files.filter((f) => f.data.wp === wp)
    const attempts = Math.max(...own.map((f) => f.data.attempt))
    const first = effective.find((f) => f.data.wp === wp && f.data.attempt === 1)
    const firstPass =
      attempts === 1 &&
      first !== undefined &&
      !first.data.leadTookOver &&
      first.data.confirmedClasses.length === 0 &&
      !first.data.gates.some(isFailure)
    return {
      wp,
      attempts,
      firstPass,
      retries: attempts - 1,
      tookOver: own.some((f) => f.data.leadTookOver),
      gateMs: own.reduce((sum, f) => sum + f.data.gates.reduce((s, g) => s + g.durationMs, 0), 0),
    }
  })
}

function overThreshold(opts: {
  severe: boolean
  inMilestone: number
  cumulative: number
  config: HarnessConfig
}): boolean {
  if (opts.severe) return opts.cumulative > 0
  return opts.inMilestone >= opts.config.ordinaryInMilestone || opts.cumulative >= opts.config.ordinaryCumulative
}

/** Counts classes, finds promotion candidates (severe on first occurrence, ordinary over thresholds) and WP stats. */
export function analyzeRetro(opts: {
  files: AttemptFile[]
  config: HarnessConfig
  lessons: Lesson[]
  n: number
}): RetroAnalysis {
  const current = opts.files.filter((f) => milestoneNumber(f) === opts.n)
  const inMilestone = filesByClass(current)
  const cumulative = filesByClass(opts.files.filter((f) => milestoneNumber(f) <= opts.n))
  const withLesson = new Set(opts.lessons.filter((l) => l.status === 'active').map((l) => l.class))
  const classes = [...cumulative.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((cls) => ({
      cls,
      severity: opts.config.severeClasses.includes(cls) ? ('severe' as const) : ('ordinary' as const),
      inMilestone: inMilestone.get(cls)?.length ?? 0,
      cumulative: cumulative.get(cls)?.length ?? 0,
      lesson: withLesson.has(cls),
    }))
  const candidates = classes
    .filter((c) => !c.lesson && overThreshold({ ...c, severe: c.severity === 'severe', config: opts.config }))
    .map((c) => {
      const all = cumulative.get(c.cls) ?? []
      const sources = [...(inMilestone.get(c.cls) ?? []), ...all.filter((f) => milestoneNumber(f) !== opts.n)]
      return { cls: c.cls, severity: c.severity, inMilestone: c.inMilestone, cumulative: c.cumulative, sources }
    })
  return { milestone: `M${String(opts.n)}`, classes, candidates, wpStats: wpStats(current) }
}

function percent(part: number, total: number): string {
  return total === 0 ? 'n/a' : `${String(part)}/${String(total)} (${String(Math.round((part / total) * 100))}%)`
}

/** Markdown retro summary: rates, classes and harness cost per WP. */
export function renderRetro(analysis: RetroAnalysis): string {
  const stats = analysis.wpStats
  const m = analysis.milestone
  const yesNo = (v: boolean): string => (v ? 'yes' : 'no')
  return [
    `# Retro ${m}`,
    '',
    `- First-pass rate: ${percent(stats.filter((s) => s.firstPass).length, stats.length)}`,
    `- Retries: ${String(stats.reduce((sum, s) => sum + s.retries, 0))}`,
    `- Lead takeovers: ${String(stats.filter((s) => s.tookOver).length)}`,
    '',
    '## Classes',
    `| Class | Severity | ${m} | Cumulative | Active lesson |`,
    '|---|---|---|---|---|',
    ...analysis.classes.map(
      (c) => `| ${c.cls} | ${c.severity} | ${String(c.inMilestone)} | ${String(c.cumulative)} | ${yesNo(c.lesson)} |`,
    ),
    '',
    '## Cost per WP',
    '| WP | Attempts | First pass | Retries | Lead took over | Gate duration (s) |',
    '|---|---|---|---|---|---|',
    ...stats.map(
      (s) =>
        `| ${s.wp} | ${String(s.attempts)} | ${yesNo(s.firstPass)} | ${String(s.retries)} | ${yesNo(s.tookOver)} | ${(s.gateMs / 1000).toFixed(1)} |`,
    ),
    '',
  ].join('\n')
}

/** Runs the retro for milestone `n`; scaffolds lessons and evals unless `dryRun`. Returns printable lines. */
export function runRetro(opts: { root: string; n: number; dryRun: boolean; date: Date }): string[] {
  const { files, errors } = loadAttempts(opts.root)
  const lessons = loadLessons(opts.root)
  const analysis = analyzeRetro({ files, config: loadConfig(opts.root), lessons: lessons.lessons, n: opts.n })
  const lines = [renderRetro(analysis), '## Promotion candidates']
  if (analysis.candidates.length === 0) lines.push('None.')
  for (const candidate of analysis.candidates) {
    const why = candidate.severity === 'severe' ? 'severe, promotes on first occurrence' : 'ordinary, over threshold'
    const label = `- ${candidate.cls} (${why}; sources ${candidate.sources.map((s) => s.name).join(', ')})`
    if (opts.dryRun) {
      lines.push(`${label}: dry run, nothing scaffolded`)
      continue
    }
    const result = scaffoldLesson({ root: opts.root, candidate, milestone: analysis.milestone, date: opts.date })
    lines.push(`${label}: ${result.created ? 'scaffolded' : 'already scaffolded'} ${result.id}`)
  }
  const warnings = [...errors, ...lessons.errors].map((e) => `warning: skipped ${e}`)
  return [...lines, ...warnings]
}

async function main(argv: string[]): Promise<number> {
  const { n, dryRun } = parseMilestoneCommand(argv)
  const lines = runRetro({ root: REPO_ROOT, n, dryRun, date: new Date() })
  console.log(lines.join('\n'))
  return Promise.resolve(0)
}

if (isMain(import.meta.url)) runCli(main)
