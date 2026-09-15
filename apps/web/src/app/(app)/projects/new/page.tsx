import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { createProjectFromForm } from '../../../../server/actions/work/projects/createProject'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'New project' }

export default function NewProjectPage() {
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'New project' }]} />
      <PageContent>
        <PageHeader title="New project" description="Create a project in your permitted workspace scope." />
        <form
          action={createProjectFromForm}
          className="ops-detail-card max-w-xl space-y-4 rounded-lg border bg-card p-5"
        >
          <label className="block text-sm font-medium" htmlFor="name">
            Name
            <input
              id="name"
              name="name"
              required
              maxLength={200}
              className="mt-2 block w-full rounded-md border px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="description">
            Description
            <textarea
              id="description"
              name="description"
              rows={5}
              maxLength={20000}
              className="mt-2 block w-full rounded-md border px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="ops-action-button rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Create project
          </button>
        </form>
      </PageContent>
    </>
  )
}
