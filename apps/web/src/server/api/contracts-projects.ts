import {
  configureProjectMonthlyDesignSchema,
  createDeliverableSchema,
  createProjectSchema,
  expectedVersionSchema,
  projectMemberSchema,
  updateProjectSchema,
} from '@ops/module-work'

/** Project endpoints, kept together so the product API registry stays resource-oriented. */
export const PROJECT_CONTRACTS = {
  'projects.list': {
    method: 'GET',
    path: '/api/v1/projects',
    summary: 'Projects you can see, by name; ?page=&limit= (max 100).',
    success: 200,
  },
  'projects.get': { method: 'GET', path: '/api/v1/projects/:id', summary: 'One project.', success: 200 },
  'projects.create': {
    method: 'POST',
    path: '/api/v1/projects',
    summary: 'Create a project; you own it unless ownerId says otherwise.',
    body: createProjectSchema,
    success: 201,
  },
  'projects.update': {
    method: 'PATCH',
    path: '/api/v1/projects/:id',
    summary: 'Change editable project fields while the project is still at expectedUpdatedAt.',
    body: updateProjectSchema.omit({ projectId: true }),
    success: 200,
  },
  'projects.members.add': {
    method: 'POST',
    path: '/api/v1/projects/:id/members',
    summary: 'Add a member to a project.',
    body: projectMemberSchema,
    success: 201,
  },
  'projects.members.remove': {
    method: 'DELETE',
    path: '/api/v1/projects/:id/members/:memberId',
    summary: 'Remove a member from a project.',
    body: expectedVersionSchema,
    success: 200,
  },
  'projects.monthlyDesign.configure': {
    method: 'PATCH',
    path: '/api/v1/projects/:id/monthly-design',
    summary: 'Configure opt-in monthly design work orders for a project.',
    body: configureProjectMonthlyDesignSchema.omit({ projectId: true }),
    success: 200,
  },
  'projects.monthlyDesign.get': {
    method: 'GET',
    path: '/api/v1/projects/:id/monthly-design',
    summary: 'Read a project’s monthly design work order settings.',
    success: 200,
  },
  'projects.deliverables.create': {
    method: 'POST',
    path: '/api/v1/projects/:id/deliverables',
    summary: 'Create a draft deliverable for a project.',
    body: createDeliverableSchema.omit({ projectId: true }),
    success: 201,
  },
} as const
