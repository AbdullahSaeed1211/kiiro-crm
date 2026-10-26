import type { ContentItemRecord } from '@ops/module-work'

export interface ContentItem extends ContentItemRecord {
  readonly projectName: string
}

/** DateField returns UTC midnight; retain an existing scheduled time when only its calendar day changes. */
export function preserveUtcTimeOnDate(value: number | null, previous: number | null): number | null {
  if (value === null || previous === null) return value
  const day = Math.floor(value / 86_400_000)
  const time = ((previous % 86_400_000) + 86_400_000) % 86_400_000
  return day * 86_400_000 + time
}

export interface ProjectOption {
  readonly id: string
  readonly name: string
}
export interface DraftEdit {
  readonly channel: string
  readonly publishAt: number | null
}
export interface CreateContentInput {
  readonly projectId: string
  readonly title: string
  readonly channel: string | null
  readonly publishAt: number | null
  readonly status: 'draft' | 'scheduled'
}
