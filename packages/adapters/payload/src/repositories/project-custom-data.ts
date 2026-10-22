import type { Id } from '@ops/kernel'
import type { MonthlyDesignConfig, WorkRepository } from '@ops/module-work'
import type { PayloadRequest } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, msOf } from './documents'
import { findAsUser, updateIfUnchanged } from './local-api'

const byId = (id: Id) => ({ id: { equals: id } })

async function updateProjectCustomData(
  req: PayloadRequest,
  input: { readonly id: Id; readonly key: string; readonly value: unknown; readonly expectedUpdatedAt: number },
) {
  const [project] = await findAsUser(req, { collection: COLLECTIONS.projects, where: byId(input.id), limit: 1 })
  if (project === undefined) return undefined
  const current = fieldOf(project, 'customData')
  const customData = typeof current === 'object' && current !== null && !Array.isArray(current) ? current : {}
  const saved = await updateIfUnchanged(req, {
    collection: COLLECTIONS.projects,
    id: input.id,
    expectedUpdatedAt: input.expectedUpdatedAt,
    data: { customData: { ...customData, [input.key]: input.value } },
  })
  return saved === undefined ? undefined : msOf(fieldOf(saved, 'updatedAt'))
}

export async function updateProjectRetainer(
  req: PayloadRequest,
  input: { readonly id: Id; readonly retainer: boolean; readonly expectedUpdatedAt: number },
): Promise<Awaited<ReturnType<WorkRepository['updateProjectRetainer']>>> {
  const updatedAt = await updateProjectCustomData(req, {
    id: input.id,
    key: 'retainer',
    value: input.retainer,
    expectedUpdatedAt: input.expectedUpdatedAt,
  })
  return updatedAt === undefined ? undefined : { retainer: input.retainer, updatedAt }
}

export async function updateProjectMonthlyDesign(
  req: PayloadRequest,
  input: { readonly id: Id; readonly config: MonthlyDesignConfig; readonly expectedUpdatedAt: number },
): Promise<Awaited<ReturnType<WorkRepository['updateProjectMonthlyDesign']>>> {
  const updatedAt = await updateProjectCustomData(req, {
    id: input.id,
    key: 'monthlyDesign',
    value: input.config,
    expectedUpdatedAt: input.expectedUpdatedAt,
  })
  return updatedAt === undefined ? undefined : { config: input.config, updatedAt }
}
