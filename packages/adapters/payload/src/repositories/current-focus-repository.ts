import type { CurrentFocus, WorkRepository } from '@ops/module-work'
import type { PayloadRequest } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { createAsSystem, findAsUser } from './local-api'
import { fieldOf, idOf, textOf, type Doc } from './documents'

function rowId(doc: Doc): string {
  const id = textOf(doc, 'id')
  if (id === undefined) throw new Error('Current focus row has no id')
  return id
}

async function writeFocus(req: PayloadRequest, id: string, data: object): Promise<void> {
  await req.payload.update({ collection: COLLECTIONS.currentFocus, id, data, depth: 0, overrideAccess: true, req })
}

async function findFocus(req: PayloadRequest, userId: string) {
  return findAsUser(req, { collection: COLLECTIONS.currentFocus, where: { user: { equals: userId } }, limit: 1 })
}

async function saveFocus(req: PayloadRequest, focus: CurrentFocus): Promise<void> {
  const data = { user: focus.userId, task: focus.taskId, startedAt: focus.startedAt }
  const [existing] = await findFocus(req, String(focus.userId))
  if (existing !== undefined) return writeFocus(req, rowId(existing), data)
  try {
    await createAsSystem(req, COLLECTIONS.currentFocus, data)
  } catch (error) {
    // A concurrent start may win the unique-user insert. Update that single row to the latest explicit choice.
    const [raced] = await findFocus(req, String(focus.userId))
    if (raced === undefined) throw error
    await writeFocus(req, rowId(raced), data)
  }
}

export function currentFocusMethods(
  req: PayloadRequest,
): Pick<WorkRepository, 'saveCurrentFocus' | 'clearCurrentFocus' | 'clearCurrentFocusForTask'> {
  return {
    saveCurrentFocus: (focus) => saveFocus(req, focus),
    clearCurrentFocus: async (userId) => {
      const [doc] = await findFocus(req, String(userId))
      if (doc === undefined) return
      await req.payload.delete({
        collection: COLLECTIONS.currentFocus,
        id: rowId(doc),
        overrideAccess: true,
        req,
      })
    },
    clearCurrentFocusForTask: async (userId, taskId) => {
      const [doc] = await findFocus(req, String(userId))
      if (doc === undefined || String(idOf(fieldOf(doc, 'task'))) !== String(taskId)) return
      await req.payload.delete({ collection: COLLECTIONS.currentFocus, id: rowId(doc), overrideAccess: true, req })
    },
  }
}
