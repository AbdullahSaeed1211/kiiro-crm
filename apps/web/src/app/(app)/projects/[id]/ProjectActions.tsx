'use client'

import { addProjectMember } from '../../../../server/actions/work/projects/addProjectMember'
import { createProject } from '../../../../server/actions/work/projects/createProject'
import { removeProjectMember } from '../../../../server/actions/work/projects/removeProjectMember'
import { updateProject } from '../../../../server/actions/work/projects/updateProject'

export default function ProjectActions({
  projectId,
  updatedAt,
  memberIds,
}: Readonly<{ projectId: string; updatedAt: number; memberIds: readonly string[] }>) {
  const member = memberIds[0] ?? projectId
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm"
        onClick={() => {
          void updateProject({ projectId, expectedUpdatedAt: updatedAt, patch: { description: '' } })
        }}
      >
        Save details
      </button>
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm"
        onClick={() => {
          void createProject({ name: 'New project' })
        }}
      >
        New project
      </button>
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm"
        onClick={() => {
          void removeProjectMember(projectId, member, updatedAt)
        }}
      >
        Remove member
      </button>
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm"
        onClick={() => {
          void addProjectMember(projectId, member, updatedAt)
        }}
      >
        Keep member
      </button>
    </div>
  )
}
