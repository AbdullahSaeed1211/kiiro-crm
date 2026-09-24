import { PROJECTS } from './project-data'
import { FIRST_CLIENT_TASKS } from './task-data-first'
import { SECOND_CLIENT_TASKS } from './task-data-second'

export type { ProjectSeed, TaskSeed } from './work-seed-types'
export { PROJECTS }
export const TASKS = [...FIRST_CLIENT_TASKS, ...SECOND_CLIENT_TASKS]
