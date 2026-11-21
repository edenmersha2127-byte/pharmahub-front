import { useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, PencilIcon } from "lucide-react";
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

const toForm = (h) => ({
  name: h?.name ?? "",
  email: h?.email ?? "",
  hospitalId: h?.hospitalId ?? "",
  baseUrl: h?.baseUrl ?? "",
  apiKey: "",
  active: h?.active ?? true,
});

/**
 * Admin dialog to edit a connected hospital, including its Hospital ID.
 * Render it only while a hospital is being edited (it reads `hospital` once,
 * on mount): `{editing && <EditHospitalDialog key={editing.id} … />}`.
 */
export default function EditHospitalDialog({ hospital, onClose, onUpdate }) {
  const [form, setForm] = useState(() => toForm(hospital));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const idChanged = form.hospitalId.trim() !== hospital.hospitalId;

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      hospitalId: form.hospitalId.trim(),
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim(),
      active: form.active,
    };
    if (!payload.name) return setError("Enter the hospital name.");
    if (!/^\S+@\S+\.\S+$/.test(payload.email)) return setError("Enter a valid contact email.");
    if (!payload.hospitalId) return setError("Enter the Hospital ID.");
    if (payload.hospitalId.length > 100) return setError("The Hospital ID can be at most 100 characters.");
    if (!payload.baseUrl) return setError("Enter the hospital's base URL.");

    setError("");
    setSubmitting(true);
    try {
      const updated = await onUpdate(hospital.id, payload);
      toast.success(`${updated.name} updated.`);
      onClose();
    } catch (err) {
      setError(extractApiError(err, "Could not update the hospital."));
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilIcon className="size-5 text-indigo-600" />
            Edit hospital
          </DialogTitle>
          <DialogDescription>Update the details used to verify prescriptions with this hospital.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="eh-name" className={labelClass}>Hospital name</label>
            <input id="eh-name" value={form.name} onChange={set("name")} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="eh-email" className={labelClass}>Contact email</label>
            <input id="eh-email" type="email" value={form.email} onChange={set("email")} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="eh-id" className={labelClass}>Hospital ID</label>
            <input
              id="eh-id"
              value={form.hospitalId}
              onChange={set("hospitalId")}
              maxLength={100}
              className={cn(fieldClass, "font-mono")}
            />
            <p className={cn("mt-1 text-xs", idChanged ? "text-amber-600" : "text-muted-foreground")}>
              {idChanged
                ? "The hospital must use this same ID on their side, or verification with them will stop working."
                : "Must match the ID the hospital has configured on their side."}
            </p>
          </div>

          <div>
            <label htmlFor="eh-url" className={labelClass}>Base URL</label>
            <input id="eh-url" type="url" value={form.baseUrl} onChange={set("baseUrl")} className={fieldClass} />
          </div>

          <div>
            <label htmlFor="eh-key" className={labelClass}>
              API key <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="eh-key"
              value={form.apiKey}
              onChange={set("apiKey")}
              placeholder="Leave empty to keep the current key"
              autoComplete="off"
              className={fieldClass}
            />
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-foreground/10 px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium text-foreground">Active</span>
              <span className="block text-xs text-muted-foreground">Inactive hospitals are not used for verification.</span>
            </span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="size-4 accent-indigo-600"
            />
          </label>

          <ErrorBanner>{error}</ErrorBanner>

          <button type="submit" disabled={submitting} className={cn(primaryBtn, "h-11 w-full")}>
            {submitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
