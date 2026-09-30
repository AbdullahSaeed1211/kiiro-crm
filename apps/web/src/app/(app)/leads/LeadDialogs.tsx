'use client'

import type { LeadPageData } from '../../../server/crm/leads/types'
import { markLost } from '../../../server/crm/leads/actions'
import { LostReasonDialog } from '../LostReasonDialog'

export { ConvertDialog } from './ConvertDialog'

type DialogProps = Readonly<{ data: LeadPageData; open: boolean; onOpenChange: (open: boolean) => void }>

export function LostDialog(props: DialogProps) {
  const lead = props.data.item.lead
  return (
    <LostReasonDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      recordId={lead.id}
      noun="lead"
      markLost={markLost}
      expectedUpdatedAt={lead.updatedAt}
      lostReasons={props.data.lostReasons}
    />
  )
}
