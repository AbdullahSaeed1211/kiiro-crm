/** The lead views in tab order; the table and board keep the current search and stage filters. */
export function leadViews(input: { readonly tableHref: string; readonly boardHref: string }) {
  return [
    { id: 'table', label: 'Table', href: input.tableHref },
    { id: 'board', label: 'Board', href: input.boardHref },
    { id: 'followUps', label: 'Follow-ups', href: '/leads/follow-ups' },
  ] as const
}
