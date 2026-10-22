'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import type { ContentItem, ProjectOption } from './content-calendar-pieces'

export function ContentContextHeader({
  selectedProjectId,
  projects,
  items,
  copy,
  onProjectChange,
}: Readonly<{
  selectedProjectId: string
  projects: readonly ProjectOption[]
  items: readonly ContentItem[]
  copy: AgencyWorkCopy
  onProjectChange: (projectId: string) => void
}>) {
  return (
    <section className="grid gap-4 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)] lg:items-end">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium">{copy.contentProject}</span>
        <NativeSelect
          aria-label={copy.contentProject}
          value={selectedProjectId}
          onChange={(event) => {
            onProjectChange(event.target.value)
          }}
        >
          <option value="">{copy.allContent}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </NativeSelect>
      </label>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>
          {copy.draftView}: {items.filter((item) => item.status === 'draft').length}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {copy.scheduledView}: {items.filter((item) => item.status === 'scheduled').length}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {copy.publishedView}: {items.filter((item) => item.status === 'published').length}
        </span>
      </div>
    </section>
  )
}
