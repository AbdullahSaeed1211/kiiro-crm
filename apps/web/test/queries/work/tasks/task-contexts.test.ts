import { asId } from '@ops/kernel'
import { describe, expect, it } from 'vitest'
import { buildTaskContextMap } from '../../../../src/server/queries/work/tasks/task-contexts'

describe('buildTaskContextMap', () => {
  it('links visible project or related-record context and omits hidden records', () => {
    const tasks = [
      {
        id: asId('task-project'),
        projectId: asId('project-1'),
        relatedType: 'organization',
        relatedId: asId('organization-1'),
      },
      {
        id: asId('task-organization'),
        projectId: null,
        relatedType: 'organization',
        relatedId: asId('organization-1'),
      },
      {
        id: asId('task-hidden'),
        projectId: null,
        relatedType: 'organization',
        relatedId: asId('organization-hidden'),
      },
    ]
    const labels = new Map<'project' | 'organization', ReadonlyMap<string, string>>([
      ['project', new Map([['project-1', 'Example project']])],
      ['organization', new Map([['organization-1', 'Example organization']])],
    ])

    expect(buildTaskContextMap(tasks, labels)).toEqual(
      new Map([
        ['task-project', { label: 'Example project', href: '/projects/project-1' }],
        ['task-organization', { label: 'Example organization', href: '/organizations/organization-1' }],
      ]),
    )
  })
})
