import { useEffect, useState } from "react";
import { PrinterIcon, ReceiptIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getSale } from "@/features/sales/api/salesApi";
import Receipt from "@/features/sales/components/Receipt";
import { ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn } from "@/components/common/styles";
import { extractApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

/** Loads and shows the receipt of one sale. Pass `saleId = null` to keep it closed. */
export default function ReceiptDialog({ saleId, customerName, onClose }) {
  // Remember which sale the result belongs to, so a stale one is never shown.
  const [result, setResult] = useState({ saleId: null, receipt: null, error: "" });

  useEffect(() => {
    if (!saleId) return undefined;
    let active = true;
    async function load() {
      try {
        const receipt = await getSale(saleId);
        if (active) setResult({ saleId, receipt, error: "" });
      } catch (e) {
        if (active) setResult({ saleId, receipt: null, error: extractApiError(e, "Could not load this receipt.") });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [saleId]);

  const ready = result.saleId === saleId;
  const receipt = ready ? result.receipt : null;

  return (
    <Dialog open={Boolean(saleId)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptIcon className="size-5 text-indigo-600" />
            Sale receipt
          </DialogTitle>
          <DialogDescription>What was sold, for how much and how it was paid.</DialogDescription>
        </DialogHeader>

        {!ready && <div className="h-48 animate-pulse rounded-2xl bg-muted/40" />}
        {ready && <ErrorBanner>{result.error}</ErrorBanner>}
        {receipt && (
          <>
            <Receipt receipt={receipt} customerName={customerName} />
            <button onClick={() => window.print()} className={cn(primaryBtn, "h-11 w-full")}>
              <PrinterIcon className="size-4" /> Print receipt
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
