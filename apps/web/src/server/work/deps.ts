import { asId, systemClock } from '@ops/kernel'
import { can, type Actor, type UnitOfWork } from '@ops/platform'
import { memoryTaskRepository } from './memory-task-repository'
import type { WorkDeps } from './task-repository'

const DEVELOPMENT_ACTOR: Actor = { id: asId('dev-owner'), role: 'owner', groupIds: [], reportIds: [], active: true }
const DIRECT_UNIT_OF_WORK: UnitOfWork = { run: (work) => work() }

/** Per-request work dependencies; development-only until M1-L3 wires Payload and sessions. */
export function getWorkDeps(): Promise<WorkDeps> {
  // The fixed owner actor must never serve real visitors.
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
