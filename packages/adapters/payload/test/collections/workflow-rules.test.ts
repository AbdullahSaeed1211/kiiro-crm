import { describe, expect, it } from 'vitest'
import {
  ensureStageId,
  hasUniqueStageNames,
  isTerminalCategory,
  MAX_STAGES,
  stagesOf,
  validateDefaultStage,
  validateStages,
} from '../../src/collections/workflow-rules'

const stage = (id: string, name: string, category: string) => ({ id, name, category, color: 'gray', position: 0 })

const TODO = stage('s-open', 'To do', 'open')
const DONE = stage('s-done', 'Done', 'done_success')
const DROPPED = stage('s-cancelled', 'Dropped', 'cancelled')

describe('validateStages', () => {
  it('accepts a workflow with a non-terminal stage and distinct names', () => {
    expect(validateStages([TODO, DONE, DROPPED])).toBe(true)
  })

  it('requires at least one stage that is not terminal', () => {
    const message = 'Add at least one stage that is not done or cancelled.'
    expect(validateStages([DONE, DROPPED])).toBe(message)
    expect(validateStages([])).toBe(message)
    expect(validateStages(null)).toBe(message)
  })

  it('rejects names that repeat after trimming and ignoring case', () => {
    expect(validateStages([TODO, stage('s2', '  to DO ', 'active')])).toBe('Each stage needs a different name.')
  })

  it('allows at most MAX_STAGES stages', () => {
    const stages = Array.from({ length: MAX_STAGES + 1 }, (_, index) =>
      stage(`s${String(index)}`, `S${String(index)}`, 'open'),
    )
    expect(validateStages(stages.slice(0, MAX_STAGES))).toBe(true)
    expect(validateStages(stages)).toBe('A workflow can have at most 20 stages.')
  })
})

describe('validateDefaultStage', () => {
  const stages = [TODO, DONE]

  it('accepts an existing non-terminal stage', () => {
    expect(validateDefaultStage(TODO.id, stages)).toBe(true)
  })

  it('requires a default stage id', () => {
    expect(validateDefaultStage(undefined, stages)).toBe('Choose a default stage.')
    expect(validateDefaultStage('', stages)).toBe('Choose a default stage.')
  })

  it('rejects unknown and terminal stages', () => {
    expect(validateDefaultStage('missing', stages)).toBe('The default stage must be one of the workflow stages.')
    expect(validateDefaultStage(DONE.id, stages)).toBe('The default stage cannot be a done or cancelled stage.')
  })
})

describe('stage helpers', () => {
  it('classifies the three terminal categories', () => {
    expect(['done_success', 'done_failure', 'cancelled'].every(isTerminalCategory)).toBe(true)
    expect(['backlog', 'open', 'active', 'waiting'].some(isTerminalCategory)).toBe(false)
    expect(isTerminalCategory(undefined)).toBe(false)
  })

  it('compares stage names and ignores rows that are not objects', () => {
    expect(hasUniqueStageNames([TODO, DONE])).toBe(true)
    expect(hasUniqueStageNames('not a list')).toBe(true)
  })

  it('reads the stages sibling and keeps or generates stage ids', () => {
    expect(stagesOf({ stages: [TODO] })).toEqual([TODO])
    expect(stagesOf(null)).toBeUndefined()
    expect(ensureStageId('kept')).toBe('kept')
    expect(ensureStageId(undefined)).toMatch(/^[0-9a-f-]{36}$/)
  })
})
