import { asId } from '@ops/kernel'
import type { Stage, Workflow } from '@ops/platform'
import { STAGE_CATEGORY_VALUES, STAGE_COLOR_VALUES } from '../collections/values'
import { fieldOf, idOf, numberOf, oneOf, textOf, type Doc } from './documents'

function rowsOf(value: unknown): object[] {
  return Array.isArray(value)
    ? value.filter((row: unknown): row is object => typeof row === 'object' && row !== null)
    : []
}

function optionalStageFields(row: object): Pick<Stage, 'probability' | 'requiredFields'> {
  const probability = numberOf(row, 'probability')
  const required = fieldOf(row, 'requiredFields')
  const requiredFields = Array.isArray(required) ? required.filter((key): key is string => typeof key === 'string') : []
  return {
    ...(probability === null ? {} : { probability }),
    ...(requiredFields.length === 0 ? {} : { requiredFields }),
  }
}

function toStage(row: object): Stage[] {
  const id = idOf(fieldOf(row, 'id'))
  const name = textOf(row, 'name')
  const category = oneOf(STAGE_CATEGORY_VALUES, fieldOf(row, 'category'))
  if (id === undefined || name === undefined || category === undefined) return []
  const color = oneOf(STAGE_COLOR_VALUES, fieldOf(row, 'color')) ?? 'gray'
  const stage = { id, name, category, color, position: numberOf(row, 'position') ?? 0 }
  return [{ ...stage, ...optionalStageFields(row) }]
}

/** Maps a workflows document to a platform `Workflow`, stages ordered by position; `undefined` when incomplete. */
export function toWorkflow(doc: Doc): Workflow | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const recordType = textOf(doc, 'recordType')
  const defaultStageId = textOf(doc, 'defaultStageId')
  if (id === undefined || recordType === undefined || defaultStageId === undefined) return undefined
  const stages = rowsOf(fieldOf(doc, 'stages'))
    .flatMap(toStage)
    .toSorted((a, b) => a.position - b.position)
  return { id, recordType, name: textOf(doc, 'name') ?? '', stages, defaultStageId: asId(defaultStageId) }
}
