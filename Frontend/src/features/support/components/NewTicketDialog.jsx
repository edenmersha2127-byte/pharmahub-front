import { useState } from "react";
import { toast } from "sonner";
import { LifeBuoyIcon, Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ISSUE_CATEGORIES } from "@/features/support/constants";
import { submitTicket } from "@/features/support/api/supportApi";
import { ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn, fieldClass, labelClass } from "@/components/common/styles";
import { extractApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

/**
 * Dialog for a customer or pharmacy to report a problem with the app.
 * `defaultCategory` preselects a category (e.g. PAYMENT_ISSUE from billing).
 */
export default function NewTicketDialog({ open, onClose, onCreated, defaultCategory = null }) {
  const [category, setCategory] = useState(defaultCategory);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleOpenChange(next) {
    if (next) return;
    setCategory(defaultCategory);
    setSubject("");
    setDescription("");
    setError("");
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) return setError("Please choose what the problem is about.");
    if (!subject.trim()) return setError("Please add a short subject.");
    if (!description.trim()) return setError("Please describe the problem.");

    setError("");
    setSubmitting(true);
    try {
      const ticket = await submitTicket({ category, subject: subject.trim(), description: description.trim() });
      toast.success("Ticket sent. Our team will get back to you.");
      onCreated?.(ticket);
      handleOpenChange(false);
    } catch (err) {
      setError(extractApiError(err, "Could not send your ticket. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoyIcon className="size-5 text-indigo-600" />
            Contact support
          </DialogTitle>
          <DialogDescription>Tell us what went wrong with PharmaHub and we will look into it.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {ISSUE_CATEGORIES.map(({ value, label, icon: Icon, tone }) => {
              const selected = category === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setCategory(value);
                    setError("");
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm font-medium transition-all",
                    selected
                      ? "border-indigo-500/60 bg-indigo-500/5 ring-1 ring-indigo-500/30"
                      : "border-foreground/10 hover:border-foreground/20"
                  )}
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>
                    <Icon className="size-4" />
                  </span>
                  <span className="leading-tight">{label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label htmlFor="ticket-subject" className={labelClass}>Subject</label>
            <input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="A short summary of the problem"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="ticket-desc" className={labelClass}>What happened?</label>
            <textarea
              id="ticket-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="What were you trying to do, and what happened instead?"
              className={cn(fieldClass, "resize-none")}
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{description.length}/2000</p>
          </div>

          <ErrorBanner>{error}</ErrorBanner>

          <button type="submit" disabled={submitting} className={cn(primaryBtn, "h-11 w-full")}>
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Sending…
              </>
            ) : (
              "Send ticket"
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
