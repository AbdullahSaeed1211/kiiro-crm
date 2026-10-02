import type { Workflow } from '@ops/platform'
import type { Where } from 'payload'
import type { TaskSortKey } from './types'

const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const

/**
 * The where clauses that split tasks into runs, in sort order: one per priority, or one per stage by position
 * plus a last run for tasks in a stage the workflow no longer has.
 */
export function rankRuns(key: TaskSortKey, workflow: Workflow): Where[] {
  if (key === 'priority') return PRIORITIES.map((priority) => ({ priority: { equals: priority } }))
  const stages = [...workflow.stages].sort((a, b) => a.position - b.position)
  return [
    ...stages.map((stage) => ({ stageId: { equals: stage.id } })),
    { stageId: { not_in: stages.map((stage) => stage.id) } },
  ]
}

interface RunPage<T> {
  readonly records: readonly T[]
  readonly total: number
}

interface RunArgs<T> {
  readonly runs: readonly Where[]
  /** Reads page `page` of `limit` rows from one run. */
  readonly read: (where: Where, window: Readonly<{ page: number; limit: number }>) => Promise<RunPage<T>>
  readonly size: number
  /** The page asked for, from 1. */
  readonly page: number
}

/** The rows `from` to `to` (counted inside one run) of a run, reading only the run pages that hold them. */
async function readSlice<T>(
  { read, size }: Pick<RunArgs<T>, 'read' | 'size'>,
  slice: Readonly<{ run: Where; from: number; to: number }>,
): Promise<T[]> {
  const first = Math.floor(slice.from / size) + 1
  const last = Math.floor((slice.to - 1) / size) + 1
  const rows: T[] = []
  for (let page = first; page <= last; page += 1) {
    const offset = (page - 1) * size
    const found = (await read(slice.run, { page, limit: size })).records
    rows.push(...found.slice(Math.max(slice.from - offset, 0), slice.to - offset))
  }
  return rows
}

/**
 * One page of rows that come from several runs read in order. Each run is counted once, then only the run pages
 * that overlap the wanted window are read, so a long list costs a few queries instead of one per task.
 */
export async function pageAcrossRuns<T>(args: RunArgs<T>): Promise<RunPage<T>> {
  const { runs, read, size, page } = args
  const counts = await Promise.all(runs.map(async (run) => (await read(run, { page: 1, limit: 1 })).total))
  const start = (page - 1) * size
  const end = start + size
  const records: T[] = []
  let before = 0
  for (const [index, run] of runs.entries()) {
    const count = counts[index] ?? 0
    const from = Math.max(start, before) - before
    const to = Math.min(end, before + count) - before
    before += count
    if (to > from) records.push(...(await readSlice(args, { run, from, to })))
  }
  return { records, total: before }
}
