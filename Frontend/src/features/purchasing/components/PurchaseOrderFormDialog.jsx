import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2Icon, ClipboardListIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createPurchaseOrder } from "@/features/purchasing/api/purchasingApi";
import { LIMITS } from "@/features/purchasing/constants";
import SaveError from "@/features/purchasing/components/SaveError";
import { primaryBtn, ghostBtn, fieldClass, labelClass } from "@/components/common/styles";
import { formatMoney, parseApiError } from "@/lib/helpers/helpers";
import { PATHS } from "@/router/routes";
import { cn } from "@/lib/utils";

const newLine = (key) => ({ key, medicineId: "", quantity: "", unitCost: "", batchNumber: "", expiryDate: "" });

/**
 * Create a purchase order: pick a supplier and add one line per medicine.
 * Mount it only while open (the parent renders it conditionally).
 *
 * @param suppliers  [{ id, name }] to choose from (may be empty)
 * @param medicines  the pharmacy's medicines to choose from
 * @param medicinesError  message when the medicines could not be loaded
 * @param onCreated  (order) => void, after a successful save
 */
export default function PurchaseOrderFormDialog({ pharmacyId, suppliers, medicines, medicinesLoading, medicinesError, onClose, onCreated }) {
  const nextKey = useRef(1);
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState(() => [newLine(0)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fail = (message) => setError({ message });

  const setLine = (key, field) => (e) => {
    const value = e.target.value;
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, [field]: value };
        // Start from the last price paid for this medicine, if there is one.
        if (field === "medicineId" && l.unitCost === "") {
          const price = medicines.find((m) => m.id === value)?.purchasePrice;
          if (price != null) next.unitCost = String(price);
        }
        return next;
      })
    );
  };

  const addLine = () => {
    const key = nextKey.current;
    nextKey.current += 1;
    setLines((ls) => [...ls, newLine(key)]);
  };
  const removeLine = (key) => setLines((ls) => ls.filter((l) => l.key !== key));

  const total = lines.reduce((sum, l) => {
    const line = Number(l.quantity) * Number(l.unitCost);
    return sum + (Number.isFinite(line) && line > 0 ? line : 0);
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    const items = [];
    for (let i = 0; i < lines.length; i += 1) {
      const l = lines[i];
      const n = lines.length > 1 ? `Item ${i + 1}: ` : "";
      if (!l.medicineId) return fail(`${n}Choose a medicine.`);
      const quantity = Number(l.quantity);
      if (l.quantity === "" || !Number.isInteger(quantity) || quantity < 1) {
        return fail(`${n}Quantity must be a whole number of at least 1.`);
      }
      if (quantity > LIMITS.quantity) return fail(`${n}Quantity is too large.`);
      const unitCost = l.unitCost === "" ? null : Number(l.unitCost);
      if (unitCost != null && !(unitCost >= 0)) return fail(`${n}Unit cost cannot be negative.`);
      items.push({
        medicineId: l.medicineId,
        quantity,
        unitCost,
        batchNumber: l.batchNumber.trim() || null,
        expiryDate: l.expiryDate || null,
      });
    }

    setError(null);
    setSubmitting(true);
    try {
      const order = await createPurchaseOrder(pharmacyId, { supplierId: supplierId || null, items });
      toast.success("Order saved. Receive it when the stock arrives.");
      onCreated?.(order);
      onClose();
    } catch (err) {
      setError(parseApiError(err, "Could not save the order. Please try again."));
      setSubmitting(false);
    }
  }

  const noMedicines = !medicinesLoading && !medicinesError && medicines.length === 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardListIcon className="size-5 text-indigo-600" />
            New purchase order
          </DialogTitle>
          <DialogDescription>
            List what you are buying. Stock is added only when you receive the order. An order cannot be changed after
            it is saved.
          </DialogDescription>
        </DialogHeader>

        {medicinesError ? (
          <SaveError error={{ message: medicinesError }} />
        ) : noMedicines ? (
          <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
            You need at least one medicine in your inventory before you can order stock.{" "}
            <Link to={PATHS.PHARMACY_INVENTORY} className="font-semibold text-indigo-600 underline underline-offset-2">
              Go to inventory
            </Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="po-supplier" className={labelClass}>
                Supplier<span className="ml-1 font-normal text-muted-foreground">(optional)</span>
              </label>
              <select id="po-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={fieldClass}>
                <option value="">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  No suppliers saved yet.{" "}
                  <Link to={PATHS.PHARMACY_SUPPLIERS} className="font-medium text-indigo-600 underline underline-offset-2">
                    Add a supplier
                  </Link>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {lines.map((l, i) => (
                <div key={l.key} role="group" aria-label={`Item ${i + 1}`} className="rounded-xl border border-foreground/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">Item {i + 1}</p>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-600/10"
                      >
                        <Trash2Icon className="size-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="col-span-2 sm:col-span-4">
                      <label htmlFor={`po-med-${l.key}`} className={labelClass}>Medicine</label>
                      <select
                        id={`po-med-${l.key}`}
                        value={l.medicineId}
                        onChange={setLine(l.key, "medicineId")}
                        disabled={medicinesLoading}
                        className={fieldClass}
                      >
                        <option value="">{medicinesLoading ? "Loading medicines…" : "Choose a medicine"}</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.medicineName}
                            {m.brandName ? ` (${m.brandName})` : ""} · {m.stockQuantity} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`po-qty-${l.key}`} className={labelClass}>Quantity</label>
                      <input
                        id={`po-qty-${l.key}`}
                        type="number"
                        min="1"
                        step="1"
                        value={l.quantity}
                        onChange={setLine(l.key, "quantity")}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`po-cost-${l.key}`} className={labelClass}>Unit cost (ETB)</label>
                      <input
                        id={`po-cost-${l.key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.unitCost}
                        onChange={setLine(l.key, "unitCost")}
                        placeholder="Optional"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`po-batch-${l.key}`} className={labelClass}>Batch number</label>
                      <input
                        id={`po-batch-${l.key}`}
                        value={l.batchNumber}
                        onChange={setLine(l.key, "batchNumber")}
                        maxLength={LIMITS.batchNumber}
                        placeholder="Optional"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`po-exp-${l.key}`} className={labelClass}>Expiry date</label>
                      <input
                        id={`po-exp-${l.key}`}
                        type="date"
                        value={l.expiryDate}
                        onChange={setLine(l.key, "expiryDate")}
                        className={fieldClass}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button type="button" onClick={addLine} className={cn(ghostBtn, "w-fit")}>
                <PlusIcon className="size-3.5" /> Add another item
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Order total</span>
              <span className="font-semibold text-foreground">{formatMoney(total)}</span>
            </div>

            <SaveError error={error} />

            <button type="submit" disabled={submitting || medicinesLoading} className={cn(primaryBtn, "h-11 w-full")}>
              {submitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save order"
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
