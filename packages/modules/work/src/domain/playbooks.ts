import { z } from 'zod'

const DAY_MS = 24 * 60 * 60 * 1000

/** One task a playbook creates: its title and how many days after the project starts it is due. */
const playbookTaskSchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  dueInDays: z.number().int().min(0).max(365).nullable(),
})

/** A tenant-defined onboarding playbook (spec: configurable client onboarding). */
export const playbookSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  /** At most one playbook runs when a deal is won. */
  onDealWon: z.boolean(),
  tasks: z.array(playbookTaskSchema).max(100),
})

/** The tenant's playbooks; only one may run on won deals. */
export const playbooksSchema = z
  .array(playbookSchema)
  .max(50)
  .refine((items) => items.filter((item) => item.onDealWon).length <= 1, {
    message: 'Only one playbook can run when a deal is won.',
  })

export type Playbook = z.infer<typeof playbookSchema>

/** What a won deal gives its project. */
export interface WonDeal {
  readonly title: string
  readonly organizationId: string | null
  readonly ownerId: string | null
}

/** The project and task inputs a playbook produces for a won deal; due days count from `startAt` (UTC midnight). */
export function playbookPlan(playbook: Playbook, deal: WonDeal, startAt: number) {
  const day = startAt - (startAt % DAY_MS)
  return {
    project: {
      name: deal.title,
      organizationId: deal.organizationId,
      ...(deal.ownerId === null ? {} : { ownerId: deal.ownerId }),
      startAt: day,
      description: `Created from the ${playbook.name} playbook when the deal was won.`,
    },
    tasks: playbook.tasks.map((task) => ({
      title: task.title,
      ...(task.dueInDays === null ? {} : { dueAt: day + task.dueInDays * DAY_MS }),
    })),
  }
}
