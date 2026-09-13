import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { compactDate, listDir, paths, readText } from './repo.ts'
import { loadSchema, validate } from './schema.ts'
import { parseYaml } from './yaml.ts'

/** Lesson front matter (`harness/schemas/lesson.schema.json`) plus the title and file it came from. */
export interface Lesson {
  id: string
  milestone: string
  class: string
  severity: 'severe' | 'ordinary'
  status: 'active' | 'retired'
  affectedPaths: string[]
  countermeasure: { type: string; location: string }
  eval: string
  sourceAttempts: string[]
  retiredReason?: string
  title: string
  file: string
}

/** Collision-free lesson id: `L-<YYYYMMDD>-<WP-ID>-<first 6 hex of sha256(title)>`. */
export function lessonId(opts: { date: Date; wp: string; title: string }): string {
  const hash = createHash('sha256').update(opts.title, 'utf8').digest('hex').slice(0, 6)
  return `L-${compactDate(opts.date)}-${opts.wp}-${hash}`
}

/** Splits `---` front matter (YAML, or JSON when it starts with `{`) from a markdown body. */
export function splitFrontMatter(text: string): { data: unknown; body: string } | undefined {
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return undefined
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
  if (end < 0) return undefined
  const raw = lines.slice(1, end).join('\n')
  const data: unknown = raw.trim().startsWith('{') ? JSON.parse(raw) : parseYaml(raw)
  return { data, body: lines.slice(end + 1).join('\n') }
}

function titleOf(body: string, fallback: string): string {
  const heading = body.split(/\r?\n/).find((line) => line.startsWith('# '))
  return heading === undefined ? fallback : heading.slice(2).trim()
}

/** Loads and validates every `harness/lessons/L-*.md`; invalid files are reported, not thrown. */
export function loadLessons(root: string): { lessons: Lesson[]; errors: string[] } {
  const dir = paths.lessons(root)
  const schema = loadSchema(root, 'lesson')
  const lessons: Lesson[] = []
  const errors: string[] = []
  for (const name of listDir(dir).filter((n) => n.startsWith('L-') && n.endsWith('.md'))) {
    const file = join(dir, name)
    try {
      const parsed = splitFrontMatter(readText(file))
      if (parsed === undefined) throw new Error('missing front matter')
      const problems = validate(schema, parsed.data)
      if (problems.length > 0) throw new Error(problems.join('; '))
      const data = parsed.data as Omit<Lesson, 'title' | 'file'>
      lessons.push({ ...data, title: titleOf(parsed.body, data.id), file })
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { lessons, errors }
}

/** Resolves a lesson's `eval` field to its `eval.json` path (an id, a folder or a file). */
export function evalManifestPath(root: string, evalRef: string): string {
  if (!evalRef.includes('/')) return join(paths.evals(root), evalRef, 'eval.json')
  return evalRef.endsWith('.json') ? join(root, evalRef) : join(root, evalRef, 'eval.json')
}
