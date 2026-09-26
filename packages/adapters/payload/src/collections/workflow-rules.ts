import { TERMINAL_CATEGORY_VALUES } from './values'

/** Most stages one workflow may hold (spec §9.4). */
export const MAX_STAGES = 20

interface StageRow {
  readonly id: string | undefined
  readonly name: string
  readonly category: string | undefined
}

const TERMINAL: ReadonlySet<string> = new Set(TERMINAL_CATEGORY_VALUES)

function stringField(value: unknown, key: string): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const field: unknown = (value as Readonly<Record<string, unknown>>)[key]
  return typeof field === 'string' ? field : undefined
}

function toRow(value: unknown): StageRow {
  return {
    id: stringField(value, 'id'),
    name: (stringField(value, 'name') ?? '').trim().toLowerCase(),
    category: stringField(value, 'category'),
  }
}

function rowsOf(stages: unknown): StageRow[] {
  return Array.isArray(stages) ? stages.map(toRow) : []
}

/** True for the categories that end a record's journey: `done_success`, `done_failure` and `cancelled`. */
export function isTerminalCategory(category: string | undefined): boolean {
  return category !== undefined && TERMINAL.has(category)
}

/** True when no two stages share a name; names compare trimmed and case-insensitively. */
function hasUniqueStageNames(stages: unknown): boolean {
  const names = rowsOf(stages).map((row) => row.name)
  return new Set(names).size === names.length
}

/**
 * Validates a workflow's stage list against spec §9.4: at most 20 stages, at least one non-terminal stage, unique names.
 * @returns `true`, or the message shown on the stages field
 */
export function validateStages(stages: unknown): string | true {
  const rows = rowsOf(stages)
  if (rows.length > MAX_STAGES) return `A workflow can have at most ${String(MAX_STAGES)} stages.`
  if (!rows.some((row) => row.category !== undefined && !isTerminalCategory(row.category))) {
    return 'Add at least one stage that is not done or cancelled.'
  }
  return hasUniqueStageNames(stages) || 'Each stage needs a different name.'
}

/**
 * Validates that the default stage id names an existing, non-terminal stage of `stages` (spec §9.4).
 * @returns `true`, or the message shown on the default stage field
 */
export function validateDefaultStage(defaultStageId: unknown, stages: unknown): string | true {
  if (typeof defaultStageId !== 'string' || defaultStageId === '') return 'Choose a default stage.'
  const stage = rowsOf(stages).find((row) => row.id === defaultStageId)
  if (stage === undefined) return 'The default stage must be one of the workflow stages.'
  return !isTerminalCategory(stage.category) || 'The default stage cannot be a done or cancelled stage.'
}

/** Reads the `stages` sibling of the default stage field from Payload validation options. */
export function stagesOf(siblingData: unknown): unknown {
  return typeof siblingData === 'object' && siblingData !== null
    ? (siblingData as { stages?: unknown }).stages
    : undefined
}

/** Keeps a stage's id, or generates one for a new stage so the default stage can refer to it. */
export function ensureStageId(value: unknown): string {
  return typeof value === 'string' && value !== '' ? value : crypto.randomUUID()
}
