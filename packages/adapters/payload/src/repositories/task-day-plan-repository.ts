import type { TaskDayIntentEntry, WorkRepository } from '@ops/module-work'
import type { PayloadRequest, Where } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { createAsSystem, findAsUser } from './local-api'

export function taskDayPlanMethods(
  req: PayloadRequest,
): Pick<WorkRepository, 'addTaskToDayPlan' | 'removeTaskFromDayPlan'> {
  return {
    addTaskToDayPlan: async (entry: TaskDayIntentEntry) => {
      const where: Where = {
        and: [{ user: { equals: entry.userId } }, { task: { equals: entry.taskId } }, { day: { equals: entry.day } }],
      }
      if ((await findAsUser(req, { collection: COLLECTIONS.taskDayPlans, where, limit: 1 })).length > 0) return
      try {
        await createAsSystem(req, COLLECTIONS.taskDayPlans, {
          user: entry.userId,
          task: entry.taskId,
          day: entry.day,
        })
      } catch (error) {
        // Simultaneous double-clicks converge on the unique (user, day, task) row.
        if ((await findAsUser(req, { collection: COLLECTIONS.taskDayPlans, where, limit: 1 })).length > 0) return
        throw error
      }
    },
    removeTaskFromDayPlan: async (entry: TaskDayIntentEntry) => {
      const [plan] = await findAsUser(req, {
        collection: COLLECTIONS.taskDayPlans,
        where: {
          and: [{ user: { equals: entry.userId } }, { task: { equals: entry.taskId } }, { day: { equals: entry.day } }],
        },
        limit: 1,
      })
      if (plan === undefined) return
      await req.payload.delete({
        collection: COLLECTIONS.taskDayPlans,
        id: String(Reflect.get(plan, 'id')),
        overrideAccess: true,
        req,
      })
    },
  }
}
