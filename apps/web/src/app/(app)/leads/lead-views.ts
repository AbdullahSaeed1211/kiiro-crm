import type { LeadViewsCopy } from '../../../i18n/lead-views-copy'

/** The lead views in tab order; the table and board keep the current search and stage filters. */
export function leadViews(input: {
  readonly tableHref: string
  readonly boardHref: string
  readonly copy: LeadViewsCopy
}) {
  return [
    { id: 'table', label: input.copy.table, href: input.tableHref },
    { id: 'board', label: input.copy.board, href: input.boardHref },
    { id: 'followUps', label: input.copy.followUps, href: '/leads/follow-ups' },
  ] as const
}
