import type { BillingDocument } from '@ops/module-billing'
import type { BillingCopy } from '../../../i18n/billing-copy'
import { formatMoney } from './money'

/** A document's lines and totals, for the staff page, the client portal and paper. */
export function DocumentLines({
  copy,
  document,
  locale,
}: Readonly<{ copy: BillingCopy; document: BillingDocument; locale: string }>) {
  const money = (minor: number) => formatMoney({ minor, currency: document.currency, locale })
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-2">{copy.itemDescription}</th>
          <th className="py-2 text-right">{copy.quantity}</th>
          <th className="py-2 text-right">{copy.unitPrice}</th>
          <th className="py-2 text-right">{copy.taxPercent}</th>
        </tr>
      </thead>
      <tbody>
        {document.lines.map((line, index) => (
          <tr key={index} className="border-b">
            <td className="py-2">{line.description}</td>
            <td className="py-2 text-right tabular-nums">{line.quantityMilli / 1000}</td>
            <td className="py-2 text-right tabular-nums">{money(line.unitPriceMinor)}</td>
            <td className="py-2 text-right tabular-nums">{line.taxBps / 100}</td>
          </tr>
        ))}
      </tbody>
      <tfoot className="tabular-nums">
        <tr>
          <td colSpan={3} className="pt-3 text-right">
            {copy.subtotal}
          </td>
          <td className="pt-3 text-right">{money(document.subtotalMinor)}</td>
        </tr>
        <tr>
          <td colSpan={3} className="text-right">
            {copy.tax}
          </td>
          <td className="text-right">{money(document.taxMinor)}</td>
        </tr>
        <tr className="font-semibold">
          <td colSpan={3} className="text-right">
            {copy.total}
          </td>
          <td className="text-right">{money(document.totalMinor)}</td>
        </tr>
      </tfoot>
    </table>
  )
}
