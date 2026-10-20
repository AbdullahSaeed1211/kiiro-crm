import { Badge } from '@ops/ui/components/ui/badge'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrganizationLabel } from '../../../../server/crm/directory/data'
import { loadWorkReadModel, type WorkListTask } from '../../../../server/queries/work/read-models'
import { CLIENT_DASHBOARD_COPY, type ClientDashboardCopy } from '../../../../i18n/client-dashboard-copy'
import { catalogFor } from '../../../../i18n/locale'
import { PROJECT_PAGE_COPY, type ProjectPageCopy } from '../../../../i18n/project-page-copy'
import { loadClientBilling } from '../../../../server/billing/client-summary'
import { buildClientDashboard } from '../../../../server/work/client-dashboard'
import { getRequestContext } from '@/server/container'
import { ClientDashboardView } from './client-dashboard'
import { ArchiveWorkControl } from '../../archive-work-control'
import ProjectActions from './ProjectActions'
import {
  ProjectBoardContent,
  ProjectDetails,
  ProjectOverview,
  ProjectTaskList,
  type ProjectStage,
} from './project-sections'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Project' }

function projectTabs({
  tasks,
  description,
  stages,
  projectId,
  dashboard,
  copy,
}: Readonly<{
  copy: ProjectPageCopy
  tasks: readonly WorkListTask[]
  description: string | null
  stages: readonly ProjectStage[]
  projectId: string
  dashboard: { readonly label: string; readonly content: React.ReactNode }
}>) {
  return [
    { id: 'dashboard', label: dashboard.label, content: dashboard.content },
    {
      id: 'overview',
      label: copy.overview,
      content: <ProjectOverview description={description} taskCount={tasks.length} copy={copy} />,
    },
    {
      id: 'board',
      label: copy.board,
      content: <ProjectBoardContent tasks={tasks} stages={stages} projectId={projectId} copy={copy} />,
    },
    {
      id: 'list',
      label: copy.list,
      content: <ProjectTaskList tasks={tasks} copy={copy} />,
    },
  ]
}

/** The dashboard tab: task counts for everyone, and billing for owners and managers when the project has a company. */
async function dashboardFor(input: {
  readonly tasks: readonly WorkListTask[]
  readonly organizationId: string | null
  readonly locale: string
}): Promise<{ label: string; content: React.ReactNode }> {
  const context = await getRequestContext()
  const copy: ClientDashboardCopy = catalogFor(CLIENT_DASHBOARD_COPY, input.locale === 'es' ? 'es' : 'en')
  const canSeeBilling = context.actor.role === 'owner' || context.actor.role === 'manager'
  const billing =
    canSeeBilling && input.organizationId !== null ? await loadClientBilling(context, input.organizationId) : null
  return {
    label: copy.tab,
    content: (
      <ClientDashboardView
        copy={copy}
        dashboard={buildClientDashboard(input.tasks, Date.now())}
        billing={billing}
        locale={input.locale === 'es' ? 'es-ES' : 'en-US'}
      />
    ),
  }
}

/** Project record with overview, board, and list tabs. */
export default async function ProjectPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const model = await loadWorkReadModel()
  const project = model.projects.find((item) => item.id === id)
  if (project === undefined) notFound()
  const copy = catalogFor(PROJECT_PAGE_COPY, model.locale)
  const tasks = model.tasks.filter((task) => task.projectId === project.id)
  const organizationName = project.organizationId === null ? null : await getOrganizationLabel(project.organizationId)
  const dashboard = await dashboardFor({ tasks, organizationId: project.organizationId, locale: model.locale })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.projects, href: '/projects' }]} />
      <PageContent>
        <RecordPageLayout
          title={project.name}
          labels={{ breadcrumb: copy.breadcrumb, saveTitle: copy.saveTitle, cancelTitle: copy.cancelTitle }}
          stage={<Badge variant="secondary">{project.stage}</Badge>}
          tabs={projectTabs({
            tasks,
            description: project.description,
            stages: model.stages,
            projectId: project.id,
            dashboard,
            copy,
          })}
          actions={
            <div className="grid w-full gap-2 md:w-auto">
              <Link
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                href={`/tasks/new?projectId=${encodeURIComponent(project.id)}`}
              >
                {copy.createTask}
              </Link>
              <ArchiveWorkControl type="project" id={project.id} label={project.name} />
              <ProjectActions
                projectId={project.id}
                updatedAt={project.updatedAt}
                memberIds={project.memberIds}
                people={[...model.people.entries()]}
              />
            </div>
          }
          aside={
            <ProjectDetails
              copy={copy}
              project={project}
              organizationName={organizationName}
              locale={model.locale}
              timeZone={model.timeZone}
            />
          }
        />
      </PageContent>
    </>
  )
}
