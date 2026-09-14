import { Badge } from '@ops/ui/components/ui/badge'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'
import { loadWorkReadModel } from '../../../server/queries/work/read-models'

export const metadata: Metadata = { title: 'Projects · Workspace' }
export const dynamic = 'force-dynamic'

/** Projects list with open-task counts from the same scoped read model. */
export default async function ProjectsPage() {
  const model = await loadWorkReadModel()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Projects' }]} />
      <PageContent>
        <PageHeader
          title="Projects"
          count={model.projects.length}
          actions={
            <a className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" href="/projects/new">
              New project
            </a>
          }
        />
        {model.projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Projects you create or join appear here."
          />
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Target end</th>
                </tr>
              </thead>
              <tbody>
                {model.projects.map((project) => (
                  <tr className="border-b last:border-0 hover:bg-muted/30" key={project.id}>
                    <td className="px-4 py-3 font-medium">
                      <a className="hover:text-primary" href={`/projects/${project.id}`}>
                        {project.name}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{project.stage}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{project.memberIds.length}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.targetEndAt === null
                        ? 'No target'
                        : new Date(project.targetEndAt).toLocaleDateString('en')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageContent>
    </>
  )
}
