'use client'

import type { LeadPageData } from '../../../server/crm/leads/types'
import { LostReasonDialog } from './LostReasonDialog'

export { ConvertDialog } from './ConvertDialog'
export { LostReasonDialog } from './LostReasonDialog'

type DialogProps = Readonly<{ data: LeadPageData; open: boolean; onOpenChange: (open: boolean) => void }>

export function LostDialog(props: DialogProps) {
  const lead = props.data.item.lead
  return (
    <LostReasonDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      leadId={lead.id}
      expectedUpdatedAt={lead.updatedAt}
      lostReasons={props.data.lostReasons}
    />
  )
}
