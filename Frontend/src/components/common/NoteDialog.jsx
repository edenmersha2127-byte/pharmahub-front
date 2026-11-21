import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ErrorBanner } from "@/components/common/PageBits";
import { primaryBtn, fieldClass, labelClass } from "@/components/common/styles";
import { extractApiError } from "@/lib/helpers/helpers";
import { cn } from "@/lib/utils";

const dangerBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 transition-all hover:from-rose-500 hover:to-rose-400 active:scale-[0.98] disabled:opacity-60";

/**
 * Confirmation dialog that collects a short note (and optionally a number of
 * days) before running an action. Pass `config = null` to keep it closed.
 *
 * config: {
 *   title, description, fieldLabel, placeholder, confirmLabel,
 *   required?: boolean,   // the note must not be empty
 *   danger?: boolean,     // red confirm button
 *   withDays?: boolean,   // also ask for a duration in days (1–365, optional)
 *   noNote?: boolean,     // plain confirmation, no text field
 *   run: async ({ text, days }) => void,
 * }
 */
export default function NoteDialog({ config, onClose }) {
  const [text, setText] = useState("");
  const [days, setDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleOpenChange(next) {
    if (next) return;
    setText("");
    setDays("");
    setError("");
    setSubmitting(false);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const note = text.trim();
    if (config.required && !note) return setError("Please write something first.");
    let dayCount = null;
    if (config.withDays && days !== "") {
      dayCount = Number(days);
      if (!(Number.isInteger(dayCount) && dayCount >= 1 && dayCount <= 365)) {
        return setError("Days must be a whole number between 1 and 365.");
      }
    }

    setError("");
    setSubmitting(true);
    try {
      await config.run({ text: note, days: dayCount });
      handleOpenChange(false);
    } catch (err) {
      setError(extractApiError(err, "Action failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={Boolean(config)} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {config && (
          <>
            <DialogHeader>
              <DialogTitle>{config.title}</DialogTitle>
              {config.description && <DialogDescription>{config.description}</DialogDescription>}
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {config.withDays && (
                <div>
                  <label htmlFor="note-days" className={labelClass}>Duration in days</label>
                  <input
                    id="note-days"
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    placeholder="Leave empty for the default"
                    className={fieldClass}
                  />
                </div>
              )}

              {!config.noNote && (
                <div>
                  <label htmlFor="note-text" className={labelClass}>
                    {config.fieldLabel ?? "Note"}
                    {!config.required && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
                  </label>
                  <textarea
                    id="note-text"
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={2000}
                    placeholder={config.placeholder}
                    className={cn(fieldClass, "resize-none")}
                  />
                  <p className="mt-1 text-right text-[11px] text-muted-foreground">{text.length}/2000</p>
                </div>
              )}

              <ErrorBanner>{error}</ErrorBanner>

              <button type="submit" disabled={submitting} className={cn(config.danger ? dangerBtn : primaryBtn, "h-11 w-full")}>
                {submitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" /> Working…
                  </>
                ) : (
                  config.confirmLabel ?? "Confirm"
                )}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
