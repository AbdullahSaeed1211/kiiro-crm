import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import type { ContentItem, CreateContentInput, DraftEdit, ProjectOption } from './content-calendar-pieces'

export type WorkbenchProps = Readonly<{
  projects: readonly ProjectOption[]
  selectedProjectId: string
  selectedItem: ContentItem | null
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  message: string
  year: number
  month: number
  weekStartsOn: 0 | 1
  timeZone: string
  today: Readonly<{ year: number; month: number }>
  items: readonly ContentItem[]
  events: readonly CalendarEvent[]
  onProjectChange: (projectId: string) => void
  onCreate: (input: CreateContentInput) => Promise<boolean>
  onDraftUpdate: (item: ContentItem, edit: DraftEdit) => void
  onPublish: (item: ContentItem) => void
  onEdit: (item: ContentItem) => void
  onDialogChange: (open: boolean) => void
  onSave: (
    item: ContentItem,
    patch: {
      readonly title?: string
      readonly channel?: string | null
      readonly publishAt?: number | null
      readonly status?: ContentItem['status']
    },
  ) => Promise<string | null>
}>
