import { Badge } from '@ops/ui/components/ui/badge'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { isManagerUp } from '@ops/platform'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOrganizationLabel } from '../../../../server/crm/directory/data'
import { loadWorkReadModel, type WorkListTask, type WorkReadModel } from '../../../../server/queries/work/read-models'
import { CLIENT_DASHBOARD_COPY, type ClientDashboardCopy } from '../../../../i18n/client-dashboard-copy'
import { catalogFor } from '../../../../i18n/locale'
import { PROJECT_PAGE_COPY, type ProjectPageCopy } from '../../../../i18n/project-page-copy'
import { todayAsDueAt } from '@ops/module-work'
import { buildClientDashboard } from '../../../../server/work/client-dashboard'
import { getRequestContext } from '@/server/container'
import { ClientDashboardView } from './client-dashboard'
import { ProjectPageActions } from './ProjectPageActions'
import ProjectActions from './ProjectActions'
import { DeliverablesTab } from './deliverables-tab'
import { AGENCY_WORK_COPY } from '../../../../i18n/agency-work-copy'
import { ProjectRetainerControl } from './ProjectRetainerControl'
import { MonthlyDesignControl } from './MonthlyDesignControl'
import {
  loadProjectMonthlyDesign,
  type ProjectMonthlyDesignView,
} from '../../../../server/queries/work/project-monthly-design'
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
  deliverables,
  agencyCopy,
  copy,
}: Readonly<{
  copy: ProjectPageCopy
  tasks: readonly WorkListTask[]
  description: string | null
  stages: readonly ProjectStage[]
  projectId: string
  dashboard: { readonly label: string; readonly content: React.ReactNode }
  deliverables: React.ReactNode
  agencyCopy: Readonly<Record<string, string>>
}>) {
  return [
    {
      id: 'dashboard',
      label: dashboard.label,
      content: (
        <div className="grid min-w-0 grid-cols-1 gap-6">
          {dashboard.content}
          <ProjectOverview description={description} copy={copy} />
        </div>
      ),
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
    { id: 'deliverables', label: agencyCopy.deliverables, content: deliverables },
  ]
}

/** The project summary shows work in this project; client billing remains in Billing. */
function dashboardFor(input: {
  readonly tasks: readonly WorkListTask[]
  readonly locale: string
  readonly timeZone: string
}): { label: string; content: React.ReactNode } {
  const copy: ClientDashboardCopy = catalogFor(CLIENT_DASHBOARD_COPY, input.locale === 'es' ? 'es' : 'en')
  return {
    label: copy.tab,
    content: (
      <ClientDashboardView
        copy={copy}
        dashboard={buildClientDashboard(input.tasks, todayAsDueAt(Date.now(), input.timeZone))}
        locale={input.locale === 'es' ? 'es-ES' : 'en-US'}
      />
    ),
  }
}

function ProjectAside({
  project,
  organizationName,
  locale,
  timeZone,
  copy,
  monthlyDesign,
  people,
}: Readonly<{
  project: WorkReadModel['projects'][number]
  organizationName: string | null
  locale: string
  timeZone: string
  copy: ProjectPageCopy
  monthlyDesign: ProjectMonthlyDesignView | undefined
  people: WorkReadModel['people']
}>) {
  return (
    <div className="grid gap-4">
      <ProjectDetails
        copy={copy}
        project={project}
        organizationName={organizationName}
        locale={locale}
        timeZone={timeZone}
      />
      <ProjectRetainerControl
        projectId={project.id}
        retainer={project.retainer}
        updatedAt={project.updatedAt}
        locale={locale}
      />
      {monthlyDesign === undefined ? null : (
        <MonthlyDesignControl
          projectId={project.id}
          config={monthlyDesign.config}
          updatedAt={monthlyDesign.updatedAt}
          canManage={monthlyDesign.canManage}
          people={monthlyDesign.people}
          preview={monthlyDesign.preview}
        />
      )}
      <section className="ops-detail-card rounded-lg border p-4">
        <h2 className="mb-3 font-medium">{copy.members}</h2>
        <ProjectActions
          projectId={project.id}
          updatedAt={project.updatedAt}
          memberIds={project.memberIds}
          people={[...people.entries()]}
        />
      </section>
    </div>
  )
}

/** Project record with overview, board, and list tabs. */
export default async function ProjectPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const [model, context] = await Promise.all([loadWorkReadModel(), getRequestContext()])
  const project = model.projects.find((item) => item.id === id)
  if (project === undefined) notFound()
  const copy = catalogFor(PROJECT_PAGE_COPY, model.locale)
  const tasks = model.tasks.filter((task) => task.projectId === project.id)
  const [monthlyDesign, organizationName, deliverables] = await Promise.all([
    loadProjectMonthlyDesign(project.id),
    project.organizationId === null ? Promise.resolve(null) : getOrganizationLabel(project.organizationId),
    DeliverablesTab({ projectId: project.id, people: model.people }),
  ])
  const dashboard = dashboardFor({ tasks, locale: model.locale, timeZone: model.timeZone })
  const agencyCopy = catalogFor(AGENCY_WORK_COPY, model.locale)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.projects, href: '/projects' }]} />
      <PageContent>
        <RecordPageLayout
          className="ops-project-record"
          title={project.name}
          labels={{ breadcrumb: copy.breadcrumb, saveTitle: copy.saveTitle, cancelTitle: copy.cancelTitle }}
          stage={<Badge variant="secondary">{project.stage}</Badge>}
          tabs={projectTabs({
            tasks,
            description: project.description,
            stages: model.taskStages,
            projectId: project.id,
            dashboard,
            deliverables,
            agencyCopy,
            copy,
          })}
          actions={
            <ProjectPageActions
              projectId={project.id}
              projectName={project.name}
              createTaskLabel={copy.createTask}
              contentLabel={agencyCopy.contentTitle}
              moreLabel={copy.more}
              canArchive={isManagerUp(context.actor)}
            />
          }
          aside={
            <ProjectAside
              project={project}
              organizationName={organizationName}
              locale={model.locale}
              timeZone={model.timeZone}
              copy={copy}
              monthlyDesign={monthlyDesign}
              people={model.people}
            />
          }
        />
      </PageContent>
    </>
  )
}
