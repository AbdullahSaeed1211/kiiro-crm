/** Why a lead cannot be dragged or bulk-moved to a stage of this category, or null when the move is a plain stage change. */
export function leadMoveDestinationError(stage: { readonly category: string }): string | null {
  if (stage.category === 'done_success') return 'Convert the lead from its record page.'
  if (stage.category === 'done_failure') return 'Choose Mark lost and provide a lost reason.'
  if (stage.category === 'cancelled') return 'Leads cannot be cancelled from the pipeline.'
  return null
}
