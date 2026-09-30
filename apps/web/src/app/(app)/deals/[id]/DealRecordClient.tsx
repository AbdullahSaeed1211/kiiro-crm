'use client'

import { RecordPageLayout, type RecordPageTab } from '@ops/ui'
import { Badge } from '@ops/ui/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { useState, type ReactNode } from 'react'
import { DealControls } from '../DealControls'
import type { DealDetailData } from '../../../../server/crm/deals/queries'
import { formatDate, formatMoney } from '../../../../server/crm/deals/view-model'
import { RecordActionLinks } from '../../record-action-links'
import { markDealLostAction } from '../../../../server/crm/deals/actions'
import { LostReasonDialog } from '../../LostReasonDialog'

function DetailsCard({ data }: Readonly<{ data: DealDetailData }>) {
  const { deal, organization } = data
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium tabular-nums">{formatMoney(deal.value)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Created</span>
          <span>{formatDate(deal.createdAt)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Closed</span>
          <span>{formatDate(deal.closedAt)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Organization</span>
          <span>{organization?.name ?? '—'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ControlsCard({
  data,
  currency,
  onMarkLost,
}: Readonly<{ data: DealDetailData; currency: string; onMarkLost: () => void }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <DealControls
          deal={data.deal}
          stages={data.workflow.stages}
          stageCategory={data.stage.category}
          currency={currency}
          contacts={data.allContacts.map((contact) => ({
            id: contact.id,
            name: [contact.firstName, contact.lastName].filter(Boolean).join(' '),
          }))}
          onMarkLost={onMarkLost}
        />
      </CardContent>
    </Card>
  )
}

export function DealRecordClient({
  data,
  outboundEmailEnabled,
  currency,
  tabs,
  customFields,
}: Readonly<{
  data: DealDetailData
  outboundEmailEnabled: boolean
  currency: string
  tabs: readonly RecordPageTab[]
  customFields: ReactNode
}>) {
  const [lostOpen, setLostOpen] = useState(false)
  return (
    <>
      <RecordPageLayout
        labels={{ breadcrumb: 'Deal', saveTitle: 'Save title', cancelTitle: 'Cancel' }}
        title={data.deal.title}
        stage={<Badge variant="outline">{data.stage.name}</Badge>}
        actions={
          <RecordActionLinks
            recordType="deal"
            recordId={data.deal.id}
            recordLabel={data.deal.title}
            outboundEmailEnabled={outboundEmailEnabled}
          />
        }
        tabs={tabs}
        aside={
          <div className="grid gap-4">
            <ControlsCard
              data={data}
              currency={currency}
              onMarkLost={() => {
                setLostOpen(true)
              }}
            />
            <DetailsCard data={data} />
            {customFields}
          </div>
        }
      />
      <LostReasonDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        recordId={data.deal.id}
        noun="deal"
        markLost={markDealLostAction}
        expectedUpdatedAt={data.deal.updatedAt}
        lostReasons={data.lostReasons}
      />
    </>
  )
}
