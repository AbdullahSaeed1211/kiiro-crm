'use client'

import Link from 'next/link'
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
import { DEAL_RECORD_COPY, type DealRecordCopy } from '../../../../i18n/deal-record-copy'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'

function DetailRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function DetailsCard({ data, copy }: Readonly<{ data: DealDetailData; copy: DealRecordCopy }>) {
  const { deal, organization } = data
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.detailsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <DetailRow label={copy.value}>
          <span className="font-medium tabular-nums">{formatMoney(deal.value)}</span>
        </DetailRow>
        <DetailRow label={copy.created}>
          <span>{formatDate(deal.createdAt)}</span>
        </DetailRow>
        {deal.closedAt === null ? null : (
          <DetailRow label={copy.closed}>
            <span>{formatDate(deal.closedAt)}</span>
          </DetailRow>
        )}
        <DetailRow label={copy.expectedClose}>
          <span>{deal.expectedCloseAt === null ? '—' : formatDate(deal.expectedCloseAt)}</span>
        </DetailRow>
        <DetailRow label={copy.owner}>
          <span>{data.ownerName ?? copy.unassigned}</span>
        </DetailRow>
        <DetailRow label={copy.organization}>
          {organization === null ? (
            <span>—</span>
          ) : (
            <Link href={`/organizations/${organization.id}`} className="font-medium hover:underline">
              {organization.name}
            </Link>
          )}
        </DetailRow>
      </CardContent>
    </Card>
  )
}

function ControlsCard({
  data,
  currency,
  onMarkLost,
  copy,
}: Readonly<{ data: DealDetailData; currency: string; onMarkLost: () => void; copy: DealRecordCopy }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.controlsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <DealControls
          deal={data.deal}
          stages={data.workflow.stages}
          stageCategory={data.stage.category}
          currency={currency}
          contacts={data.contacts.map((contact) => ({
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
  archive,
}: Readonly<{
  data: DealDetailData
  outboundEmailEnabled: boolean
  currency: string
  tabs: readonly RecordPageTab[]
  customFields: ReactNode
  archive: ReactNode
}>) {
  const copy = catalogFor(DEAL_RECORD_COPY, useLocale())
  const [lostOpen, setLostOpen] = useState(false)
  return (
    <>
      <RecordPageLayout
        labels={{ breadcrumb: copy.breadcrumb, saveTitle: copy.saveTitle, cancelTitle: copy.cancelTitle }}
        title={data.deal.title}
        stage={<Badge variant="outline">{data.stage.name}</Badge>}
        actions={
          <RecordActionLinks
            recordType="deal"
            recordId={data.deal.id}
            recordLabel={data.deal.title}
            archive={archive}
            outboundEmailEnabled={outboundEmailEnabled}
          />
        }
        tabs={tabs}
        aside={
          <div className="grid gap-4">
            <ControlsCard
              data={data}
              currency={currency}
              copy={copy}
              onMarkLost={() => {
                setLostOpen(true)
              }}
            />
            <DetailsCard data={data} copy={copy} />
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
