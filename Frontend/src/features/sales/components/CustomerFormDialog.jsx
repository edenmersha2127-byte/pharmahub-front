import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, UserRoundIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createCustomer, updateCustomer } from "@/features/sales/api/salesApi";
import { CUSTOMER_LIMITS } from "@/features/sales/constants";
import { ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn, fieldClass, labelClass } from "@/components/common/styles";
import { extractApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CustomerForm({ customer, onSaved, onDone }) {
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    note: customer?.note ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const note = form.note.trim();
    if (!name) return setError("Enter the customer's name.");
    if (email && !EMAIL_PATTERN.test(email)) return setError("Enter a valid email address.");

    setError("");
    setSubmitting(true);
    try {
      const payload = { name, phone: phone || null, email: email || null, note: note || null };
      const saved = customer ? await updateCustomer(customer.id, payload) : await createCustomer(payload);
      toast.success(customer ? "Customer updated." : "Customer added.");
      onSaved?.(saved);
      onDone();
    } catch (err) {
      setError(extractApiError(err, "Could not save the customer."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="customer-name" className={labelClass}>Name</label>
        <input
          id="customer-name"
          value={form.name}
          onChange={set("name")}
          maxLength={CUSTOMER_LIMITS.name}
          placeholder="Full name"
          className={fieldClass}
          autoFocus
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="customer-phone" className={labelClass}>
            Phone <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="customer-phone"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            maxLength={CUSTOMER_LIMITS.phone}
            placeholder="0911 000 000"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="customer-email" className={labelClass}>
            Email <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="customer-email"
            type="text"
            inputMode="email"
            value={form.email}
            onChange={set("email")}
            maxLength={CUSTOMER_LIMITS.email}
            placeholder="name@example.com"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="customer-note" className={labelClass}>
          Note <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="customer-note"
          rows={3}
          value={form.note}
          onChange={set("note")}
          maxLength={CUSTOMER_LIMITS.note}
          placeholder="Allergies, regular medicines, anything worth remembering"
          className={cn(fieldClass, "resize-none")}
        />
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {form.note.length}/{CUSTOMER_LIMITS.note}
        </p>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      <button type="submit" disabled={submitting} className={cn(primaryBtn, "h-11 w-full")}>
        {submitting ? (
          <>
            <Loader2Icon className="size-4 animate-spin" /> Saving…
          </>
        ) : customer ? (
          "Save changes"
        ) : (
          "Add customer"
        )}
      </button>
    </form>
  );
}

/**
 * Add or edit a walk-in customer. Pass `customer` to edit, leave it empty to add.
 * `onSaved(customer)` runs after a successful save.
 */
export default function CustomerFormDialog({ open, customer, onClose, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundIcon className="size-5 text-indigo-600" />
            {customer ? "Edit customer" : "New customer"}
          </DialogTitle>
          <DialogDescription>
            Keep a record of the people who buy from you, so you can attach sales to them.
          </DialogDescription>
        </DialogHeader>

        {/* Mounted only while open, so the fields start fresh every time. */}
        {open && <CustomerForm key={customer?.id ?? "new"} customer={customer} onSaved={onSaved} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
