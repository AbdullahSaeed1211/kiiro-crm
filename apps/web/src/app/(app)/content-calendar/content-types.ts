import type { ContentItemRecord } from '@ops/module-work'

export interface ContentItem extends ContentItemRecord {
  readonly projectName: string
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
