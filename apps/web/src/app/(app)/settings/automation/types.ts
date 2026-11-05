/** Data the rule editor needs from the workspace: people, sources and both record stage lists. */
export interface Choice {
  readonly id: string
  readonly name: string
}

export interface StageChoice {
  readonly id: string
  readonly name: string
  readonly group: 'lead' | 'deal'
}

export interface Choices {
  readonly sources: readonly Choice[]
  readonly people: readonly Choice[]
  readonly stages: readonly StageChoice[]
}
