import { useEffect, useState } from "react";
import { HistoryIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getCustomer } from "@/features/sales/api/salesApi";
import { paymentTone } from "@/features/sales/constants";
import { ErrorBanner, Badge } from "@/components/common/PageBits";
import { extractApiError, formatDateTime, formatMoney } from "@/lib/helpers/helpers";

/** What one customer has bought. Pass `customer = null` to keep it closed. */
export default function CustomerHistoryDialog({ customer, onClose }) {
  const customerId = customer?.id ?? null;
  const [result, setResult] = useState({ customerId: null, purchases: [], error: "" });

  useEffect(() => {
    if (!customerId) return undefined;
    let active = true;
    async function load() {
      try {
        const detail = await getCustomer(customerId);
        if (active) setResult({ customerId, purchases: detail?.purchaseHistory ?? [], error: "" });
      } catch (e) {
        if (active) {
          setResult({ customerId, purchases: [], error: extractApiError(e, "Could not load this customer's purchases.") });
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [customerId]);

  const ready = result.customerId === customerId;
  const purchases = ready ? result.purchases : [];
  const spent = purchases.reduce((sum, p) => sum + Number(p.total ?? 0), 0);

  return (
    <Dialog open={Boolean(customer)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="size-5 text-indigo-600" />
            {customer?.name ?? "Customer"}
          </DialogTitle>
          <DialogDescription>Purchases recorded for this customer.</DialogDescription>
        </DialogHeader>

        {!ready && <div className="h-32 animate-pulse rounded-2xl bg-muted/40" />}
        {ready && <ErrorBanner>{result.error}</ErrorBanner>}

        {ready && !result.error && purchases.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No purchases yet.</p>
        )}

        {purchases.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {purchases.length} purchase{purchases.length === 1 ? "" : "s"}, {formatMoney(spent)} in total.
            </p>
            <ul className="flex flex-col divide-y divide-foreground/5 rounded-2xl border border-foreground/5">
              {purchases.map((p) => (
                <li key={p.saleId} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-foreground">{formatDateTime(p.createdAt)}</span>
                    <Badge tone={paymentTone(p.paymentMethod)} className="w-fit" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{formatMoney(p.total)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
