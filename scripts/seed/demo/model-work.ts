import { PROJECT_TASKS, RETAINER_TASKS } from './content'
import { need } from './need'
import { DELIVERY_KEYS } from './people'
import type { Random } from './random'
import type { DemoDeal, DemoOrg, DemoProject, DemoTask } from './types'

const IN_PROGRESS = 'In progress'
const PRIORITIES = [
  ['none', 1],
  ['low', 3],
  ['medium', 6],
  ['high', 3],
  ['urgent', 1],
] as const

function projectStage(random: Random, startDay: number, targetEndDay: number): string {
  if (targetEndDay < -5) return random.chance(0.92) ? 'Delivered' : 'Cancelled'
  if (startDay > -3) return 'Planned'
  return random.chance(0.12) ? 'On hold' : IN_PROGRESS
}

function members(random: Random): string[] {
  const count = random.int(2, 4)
  const pool = [...DELIVERY_KEYS]
  const chosen: string[] = []
  while (chosen.length < count) chosen.push(need(pool.splice(random.int(0, pool.length - 1), 1)[0], 'a team member'))
  return chosen
}

/** An onboarding project for most won deals, retainers for a few clients, and some internal work. */
export function makeProjects(random: Random, deals: readonly DemoDeal[], orgs: readonly DemoOrg[]): DemoProject[] {
  const projects: DemoProject[] = []
  for (const deal of deals) {
    const last = need(deal.path.at(-1), 'a stage path')
    if (last.stage !== 'Won' || !random.chance(0.85)) continue
    const startDay = Math.min(last.day + random.int(1, 6), -1)
    const targetEndDay = startDay + random.int(28, 75)
    projects.push({
      key: `project${String(projects.length)}`,
      name: `${deal.title} (onboarding)`,
      orgKey: deal.orgKey,
      description: `Delivery plan for the won deal "${deal.title}": kickoff, design, build, review and launch.`,
      stage: projectStage(random, startDay, targetEndDay),
      memberKeys: members(random),
      startDay,
      targetEndDay,
      retainer: false,
    })
  }
  for (let index = 0; index < 5; index += 1) {
    const org = random.pick(orgs)
    const startDay = -random.int(30, 120)
    projects.push({
      key: `project${String(projects.length)}`,
      name: `${org.name} monthly retainer`,
      orgKey: org.key,
      description: `Ongoing marketing work for ${org.name}: reporting, content and campaign upkeep.`,
      stage: IN_PROGRESS,
      memberKeys: members(random),
      startDay,
      targetEndDay: random.int(20, 90),
      retainer: true,
    })
  }
  return projects
}

function taskStage(random: Random, dueDay: number, projectStageName: string): string {
  if (projectStageName === 'Delivered') return 'Done'
  if (dueDay < -2)
    return random.weighted([
      ['Done', 84],
      ['Review', 8],
      [IN_PROGRESS, 8],
    ])
  if (dueDay < 3) return random.pick([IN_PROGRESS, 'Review', 'To do'])
  return dueDay < 14 ? random.pick(['To do', 'To do', 'Backlog']) : 'Backlog'
}

/** Mostly the project's members; now and then the owner or manager, so their own task lists are not empty. */
function assignees(random: Random, memberKeys: readonly string[]): string[] {
  if (random.chance(0.12)) return [random.pick(['owner', 'manager'])]
  return random.chance(0.25) ? memberKeys.slice(0, 2) : [random.pick(memberKeys)]
}

/** Tasks laid out across each project's timeline, earliest steps first. */
export function makeTasks(random: Random, projects: readonly DemoProject[]): DemoTask[] {
  const tasks: DemoTask[] = []
  for (const project of projects) {
    const templates = project.retainer ? RETAINER_TASKS : PROJECT_TASKS
    const count = Math.min(templates.length, random.int(6, templates.length))
    const span = Math.max(project.targetEndDay - project.startDay, count)
    for (let index = 0; index < count; index += 1) {
      const template = need(templates[index], 'a task template')
      const startDay = project.startDay + Math.floor((span / count) * index)
      const dueDay = startDay + Math.max(2, Math.floor(span / count))
      tasks.push({
        title: template.title,
        description: template.description,
        projectKey: project.key,
        stage: taskStage(random, dueDay, project.stage),
        priority: random.weighted(PRIORITIES),
        assigneeKeys: assignees(random, project.memberKeys),
        startDay,
        dueDay,
      })
    }
  }
  return tasks
}
