import { useEffect, useState } from "react";
import { PackageCheckIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getPurchaseOrder } from "@/features/purchasing/api/purchasingApi";
import { orderStatusTone, orderUnits, medicineLabel, formatCount } from "@/features/purchasing/constants";
import { Badge, ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn } from "@/components/common/styles";
import { extractApiError, formatDate, formatDateTime, formatMoney, shortId } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Shows one purchase order with its lines. Mount it only while open; it loads
 * the latest copy of the order by id.
 *
 * @param supplierName  (supplierId) => string
 * @param medicineOf    (medicineId) => medicine | undefined
 * @param onReceive     (order) => void — asked for draft orders
 */
export default function PurchaseOrderDetailsDialog({ pharmacyId, orderId, supplierName, medicineOf, onReceive, onClose }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getPurchaseOrder(pharmacyId, orderId);
        if (active) setOrder(data);
      } catch (e) {
        if (active) setError(extractApiError(e, "Could not load this order."));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [pharmacyId, orderId]);

  const items = order?.items ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            Order <span className="font-mono">{shortId(orderId)}</span>
            {order && <Badge tone={orderStatusTone(order.status)} />}
          </DialogTitle>
          <DialogDescription>
            {order?.status === "DRAFT"
              ? "This order has not been received yet, so its items are not in your stock."
              : "What was ordered and when."}
          </DialogDescription>
        </DialogHeader>

        <ErrorBanner>{error}</ErrorBanner>
        {!order && !error && <p className="py-8 text-center text-sm text-muted-foreground">Loading order…</p>}

        {order && (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fact label="Supplier">{supplierName(order.supplierId)}</Fact>
              <Fact label="Created">{formatDateTime(order.createdAt)}</Fact>
              <Fact label="Received">{order.receivedAt ? formatDateTime(order.receivedAt) : "Not yet"}</Fact>
              <Fact label="Units">{formatCount(orderUnits(order))}</Fact>
            </dl>

            <div className="overflow-x-auto rounded-xl border border-foreground/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Medicine</th>
                    <th className="px-3 py-2 font-medium">Batch</th>
                    <th className="px-3 py-2 font-medium">Expires</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit cost</th>
                    <th className="px-3 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-b border-foreground/5 last:border-0">
                      <td className="px-3 py-2 font-medium text-foreground">{medicineLabel(medicineOf(i.medicineId), i.medicineId)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{i.batchNumber || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(i.expiryDate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCount(i.quantity)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">{formatMoney(i.unitCost)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                        {i.unitCost == null ? "—" : formatMoney(Number(i.unitCost) * i.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-foreground/10 bg-muted/40">
                    <td colSpan={5} className="px-3 py-2 text-right text-muted-foreground">Total</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                      {formatMoney(order.totalCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {order.status === "DRAFT" && (
              <button onClick={() => onReceive(order)} className={cn(primaryBtn, "h-11 w-full")}>
                <PackageCheckIcon className="size-4" /> Receive into stock
              </button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
