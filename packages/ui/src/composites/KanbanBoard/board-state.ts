import type { KanbanCard, KanbanMove, KanbanMoveResult, KanbanStage, KanbanStageCategory } from './types'

const TERMINAL: ReadonlySet<KanbanStageCategory> = new Set(['done_success', 'done_failure', 'cancelled'])

interface CardDragData {
  readonly cardId: string
  readonly stageId: string
}

/** True for stages whose column starts collapsed (spec §9.4 `isTerminal`). */
export function isTerminalStage(stage: KanbanStage): boolean {
  return TERMINAL.has(stage.category)
}

/** Ids of the columns collapsed on first render. */
export function initialCollapsed(stages: readonly KanbanStage[]): ReadonlySet<string> {
  return new Set(stages.filter(isTerminalStage).map((stage) => stage.id))
}

/** Returns a copy of `collapsed` with `stageId` toggled. */
export function toggleCollapsed(collapsed: ReadonlySet<string>, stageId: string): ReadonlySet<string> {
  const next = new Set(collapsed)
  if (!next.delete(stageId)) next.add(stageId)
  return next
}

/** Cards per stage id, sorted by title; cards of unknown stages are dropped. */
export function groupCards(
  stages: readonly KanbanStage[],
  cards: readonly KanbanCard[],
): ReadonlyMap<string, readonly KanbanCard[]> {
  const groups = new Map<string, KanbanCard[]>(stages.map((stage) => [stage.id, []]))
  for (const card of cards) groups.get(card.stageId)?.push(card)
  for (const group of groups.values()) group.sort((a, b) => a.title.localeCompare(b.title))
  return groups
}

/** The move to send for a card, or `undefined` when the card is missing or already in `toStageId`. */
export function planMove(cards: readonly KanbanCard[], cardId: string, toStageId: string): KanbanMove | undefined {
  const card = cards.find((candidate) => candidate.id === cardId)
  if (card === undefined || card.stageId === toStageId) return undefined
  return { cardId, toStageId, expectedUpdatedAt: card.updatedAt }
}

function replaceCard(cards: readonly KanbanCard[], cardId: string, patch: Partial<KanbanCard>): KanbanCard[] {
  return cards.map((card) => (card.id === cardId ? { ...card, ...patch } : card))
}

/** Optimistically places the card in the target stage. */
export function applyMove(cards: readonly KanbanCard[], move: KanbanMove): KanbanCard[] {
  return replaceCard(cards, move.cardId, { stageId: move.toStageId })
}

/** Stores the stage and version the server confirmed. */
export function confirmMove(
  cards: readonly KanbanCard[],
  cardId: string,
  saved: Readonly<{ stageId: string; updatedAt: number }>,
): KanbanCard[] {
  return replaceCard(cards, cardId, { stageId: saved.stageId, updatedAt: saved.updatedAt })
}

/** Restores the card's stage and version from before a failed move; other cards keep their state. */
export function rollbackMove(cards: readonly KanbanCard[], previous: KanbanCard): KanbanCard[] {
  return replaceCard(cards, previous.id, { stageId: previous.stageId, updatedAt: previous.updatedAt })
}

/** Runs `onMove`, turning a thrown error into a failed result so the card rolls back. */
export async function settleMove(run: () => Promise<KanbanMoveResult>): Promise<KanbanMoveResult> {
  try {
    return await run()
  } catch (error) {
    return { ok: false, error: { code: 'INTERNAL', message: error instanceof Error ? error.message : String(error) } }
  }
}

/** Reads card drag data, or `undefined` when the payload is not a board card. */
export function readCardData(data: Readonly<Record<string | symbol, unknown>>): CardDragData | undefined {
  const { cardId, stageId } = data
  return typeof cardId === 'string' && typeof stageId === 'string' ? { cardId, stageId } : undefined
}

/** Stage of the innermost drop target that carries one (a card or a column). */
export function dropStageId(
  targets: readonly Readonly<{ data: Record<string | symbol, unknown> }>[],
): string | undefined {
  const stageIds = targets.map(({ data }) => data['stageId'])
  return stageIds.find((stageId): stageId is string => typeof stageId === 'string')
}

/** Replaces `{name}` in a label template. */
export function withName(template: string, name: string): string {
  return template.replaceAll('{name}', name)
}
