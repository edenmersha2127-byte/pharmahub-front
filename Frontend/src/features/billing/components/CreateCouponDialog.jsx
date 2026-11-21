import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, TicketPercentIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createCoupon } from "@/features/billing/api/billingApi";
import { ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn, fieldClass, labelClass } from "@/components/common/styles";
import { extractApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

const EMPTY = { code: "", discountType: "PERCENTAGE", discountValue: "", maxRedemptions: "", expiresOn: "" };

/** Admin dialog to create a discount coupon for pharmacy subscriptions. */
export default function CreateCouponDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function handleOpenChange(next) {
    if (next) return;
    setForm(EMPTY);
    setError("");
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discountValue);
    if (!code) return setError("Enter a coupon code.");
    if (!(value > 0)) return setError("Discount must be greater than zero.");
    if (form.discountType === "PERCENTAGE" && value > 100) return setError("A percentage discount cannot exceed 100.");
    const max = form.maxRedemptions === "" ? null : Number(form.maxRedemptions);
    if (max != null && !(Number.isInteger(max) && max >= 1)) return setError("Max uses must be a whole number of at least 1.");

    setError("");
    setSubmitting(true);
    try {
      const coupon = await createCoupon({
        code,
        discountType: form.discountType,
        discountValue: value,
        maxRedemptions: max,
        // Valid through the end of the chosen day.
        expiresAt: form.expiresOn ? `${form.expiresOn}T23:59:59` : null,
      });
      toast.success(`Coupon ${coupon.code} created.`);
      onCreated?.(coupon);
      handleOpenChange(false);
    } catch (err) {
      setError(extractApiError(err, "Could not create the coupon."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TicketPercentIcon className="size-5 text-indigo-600" />
            New coupon
          </DialogTitle>
          <DialogDescription>Pharmacies can enter this code when they subscribe.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="coupon-code" className={labelClass}>Code</label>
            <input
              id="coupon-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="WELCOME20"
              className={cn(fieldClass, "uppercase")}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coupon-type" className={labelClass}>Discount type</label>
              <select id="coupon-type" value={form.discountType} onChange={set("discountType")} className={fieldClass}>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed amount (ETB)</option>
              </select>
            </div>
            <div>
              <label htmlFor="coupon-value" className={labelClass}>
                {form.discountType === "PERCENTAGE" ? "Percent off" : "Amount off (ETB)"}
              </label>
              <input
                id="coupon-value"
                type="number"
                min="0"
                step="0.01"
                value={form.discountValue}
                onChange={set("discountValue")}
                placeholder={form.discountType === "PERCENTAGE" ? "20" : "200"}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="coupon-max" className={labelClass}>Max uses</label>
              <input
                id="coupon-max"
                type="number"
                min="1"
                step="1"
                value={form.maxRedemptions}
                onChange={set("maxRedemptions")}
                placeholder="Unlimited"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="coupon-expiry" className={labelClass}>Expires on</label>
              <input
                id="coupon-expiry"
                type="date"
                value={form.expiresOn}
                onChange={set("expiresOn")}
                className={fieldClass}
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-muted-foreground">
            Leave max uses or expiry empty for no limit.
          </p>

          <ErrorBanner>{error}</ErrorBanner>

          <button type="submit" disabled={submitting} className={cn(primaryBtn, "h-11 w-full")}>
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Creating…
              </>
            ) : (
              "Create coupon"
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
