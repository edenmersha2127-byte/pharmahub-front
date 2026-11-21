import { paymentLabel } from "@/features/sales/constants";
import { formatDateTime, formatMoney, shortId } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

// When printing, show only the receipt — not the sidebar, till or dialog chrome.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #sale-receipt, #sale-receipt * { visibility: visible !important; }
  #sale-receipt { position: absolute; left: 0; top: 0; width: 100%; border: 0; }
}`;

/**
 * A sale's receipt: line items, total and how it was paid.
 * `receipt` is the backend ReceiptResponse; `customerName` is optional.
 */
export default function Receipt({ receipt, customerName, className }) {
  const items = receipt.items ?? [];

  return (
    <div id="sale-receipt" className={cn("flex flex-col gap-4 rounded-2xl border border-foreground/5 bg-card p-5", className)}>
      <style>{PRINT_CSS}</style>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-heading text-base font-semibold text-foreground">Receipt</p>
          <p className="font-mono text-xs text-muted-foreground">Sale {shortId(receipt.saleId)}</p>
        </div>
        <p className="text-sm text-muted-foreground">{formatDateTime(receipt.createdAt)}</p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Medicine</th>
            <th className="pb-2 text-right font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Price</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={`${item.medicineId}-${i}`} className="border-b border-foreground/5">
              <td className="py-2 pr-2 text-foreground">{item.medicineName ?? `Medicine ${shortId(item.medicineId)}`}</td>
              <td className="py-2 text-right text-muted-foreground">{item.quantity}</td>
              <td className="py-2 text-right text-muted-foreground">{formatMoney(item.unitPrice)}</td>
              <td className="py-2 text-right font-medium text-foreground">{formatMoney(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-base">
          <dt className="font-semibold text-foreground">Total</dt>
          <dd className="font-heading font-bold text-foreground">{formatMoney(receipt.total)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Paid by</dt>
          <dd className="text-foreground">{paymentLabel(receipt.paymentMethod)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Customer</dt>
          <dd className="text-foreground">
            {customerName ?? (receipt.customerId ? `Customer ${shortId(receipt.customerId)}` : "Walk-in")}
          </dd>
        </div>
      </dl>
    </div>
  );
}
