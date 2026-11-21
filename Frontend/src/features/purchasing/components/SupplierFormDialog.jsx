import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, TruckIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createSupplier, updateSupplier } from "@/features/purchasing/api/purchasingApi";
import { LIMITS } from "@/features/purchasing/constants";
import SaveError from "@/features/purchasing/components/SaveError";
import { primaryBtn, fieldClass, labelClass } from "@/components/common/styles";
import { parseApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;

function toForm(s) {
  return {
    name: s?.name ?? "",
    phone: s?.phone ?? "",
    email: s?.email ?? "",
    address: s?.address ?? "",
    note: s?.note ?? "",
  };
}

const optional = <span className="ml-1 font-normal text-muted-foreground">(optional)</span>;

/**
 * Add / edit supplier dialog. Mount it freshly per target (the parent keys it)
 * so the form seeds from `supplier` without effect-driven resets.
 *
 * @param supplier  supplier to edit, or null to add
 * @param onSaved   (supplier) => void, after a successful save
 */
export default function SupplierFormDialog({ pharmacyId, supplier, onClose, onSaved }) {
  const isEdit = Boolean(supplier);
  const [form, setForm] = useState(() => toForm(supplier));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const fail = (message) => setError({ message });

  async function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) return fail("Enter the supplier's name.");
    if (email && !EMAIL_RE.test(email)) return fail("Enter a valid email address.");

    const payload = {
      name,
      phone: form.phone.trim() || null,
      email: email || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
    };

    setError(null);
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await updateSupplier(pharmacyId, supplier.id, payload)
        : await createSupplier(pharmacyId, payload);
      toast.success(isEdit ? "Supplier updated." : "Supplier added.");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(parseApiError(err, "Could not save the supplier. Please try again."));
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TruckIcon className="size-5 text-indigo-600" />
            {isEdit ? "Edit supplier" : "Add supplier"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this supplier's contact details." : "Save a supplier so you can pick it when you order stock."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="supplier-name" className={labelClass}>Name</label>
            <input
              id="supplier-name"
              value={form.name}
              onChange={set("name")}
              maxLength={LIMITS.supplierName}
              placeholder="Supplier or company name"
              className={fieldClass}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="supplier-phone" className={labelClass}>Phone{optional}</label>
              <input
                id="supplier-phone"
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                maxLength={LIMITS.supplierPhone}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="supplier-email" className={labelClass}>Email{optional}</label>
              <input
                id="supplier-email"
                type="text"
                inputMode="email"
                value={form.email}
                onChange={set("email")}
                maxLength={LIMITS.supplierEmail}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="supplier-address" className={labelClass}>Address{optional}</label>
            <input
              id="supplier-address"
              value={form.address}
              onChange={set("address")}
              maxLength={LIMITS.supplierAddress}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="supplier-note" className={labelClass}>Note{optional}</label>
            <textarea
              id="supplier-note"
              rows={3}
              value={form.note}
              onChange={set("note")}
              maxLength={LIMITS.supplierNote}
              placeholder="Delivery days, payment terms, contact person…"
              className={cn(fieldClass, "resize-none")}
            />
          </div>

          <SaveError error={error} />

          <button type="submit" disabled={submitting} className={cn(primaryBtn, "h-11 w-full")}>
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Saving…
              </>
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Add supplier"
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
