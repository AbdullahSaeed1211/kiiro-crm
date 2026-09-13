import { asId, systemClock } from '@ops/kernel'
import { can, type Actor, type UnitOfWork } from '@ops/platform'
import { memoryTaskRepository } from './memory-task-repository'
import type { WorkDeps } from './task-repository'

const DEVELOPMENT_ACTOR: Actor = { id: asId('dev-owner'), role: 'owner', groupIds: [], reportIds: [], active: true }
const DIRECT_UNIT_OF_WORK: UnitOfWork = { run: (work) => work() }

/**
 * Composition root of work features. Until M1-L3 wires Payload and sessions it serves the in-memory repository and a
 * fixed owner actor, so it refuses to run in production, where that would grant every visitor owner rights.
 * @returns the per-request dependencies; throws in production.
 */
export function getWorkDeps(): Promise<WorkDeps> {
  if (process.env.NODE_ENV === 'production') {
    return Promise.reject(new Error('Work dependencies are not wired for production'))
  }
  return Promise.resolve({
    actor: DEVELOPMENT_ACTOR,
    can,
    tasks: memoryTaskRepository,
    uow: DIRECT_UNIT_OF_WORK,
    clock: systemClock,
  })
}
